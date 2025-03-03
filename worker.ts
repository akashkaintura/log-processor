/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Worker, Job } from 'bullmq';
import { supabase } from './lib/supabase';
import { pipeline } from 'stream/promises';
import { Transform, Readable } from 'stream';
import { ReadableStream } from 'stream/web';

// Define the stats type with index signatures
interface LogStats {
    errors: number;
    keywords: Record<string, number>;
    ips: Record<string, number>;
}

const worker = new Worker(
    'log-processing-queue',
    async (job: Job) => {
        const { fileId, filePath, userId } = job.data;

        const { data, error } = await supabase.storage.from('log-files').download(filePath);
        if (error) throw new Error('Failed to download file');

        const stats: LogStats = { errors: 0, keywords: {}, ips: {} };
        const keywordList = process.env.KEYWORDS!.split(',');

        // @ts-ignore
        const logStream: ReadableStream<Uint8Array> = data.stream();

        // Convert web ReadableStream to Node.js Readable
        const nodeStream = Readable.from(logStream as unknown as AsyncIterable<Uint8Array>, { objectMode: false });

        const parser = new Transform({
            readableObjectMode: true,
            transform(chunk, encoding, callback) {
                const line = chunk.toString();
                const match = line.match(/\[([^\]]+)\] (\w+) (.+?)(?: \{(.+)\})?$/);
                if (match) {
                    const [, , level, message, jsonPayload] = match;
                    if (level === 'ERROR') stats.errors++;
                    keywordList.forEach((kw) => {
                        if (message.includes(kw)) stats.keywords[kw] = (stats.keywords[kw] || 0) + 1;
                    });
                    if (jsonPayload) {
                        try {
                            const payload = JSON.parse(jsonPayload);
                            if (payload.ip) stats.ips[payload.ip] = (stats.ips[payload.ip] || 0) + 1;
                        } catch { }
                    }
                }
                callback();
            },
        });

        await pipeline(nodeStream, parser);

        await supabase.from('log_stats').insert({
            job_id: job.id,
            user_id: userId,
            file_id: fileId,
            errors: stats.errors,
            keywords: stats.keywords,
            ips: stats.ips,
        });
    },
    {
        connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
        concurrency: 4,
    }
);

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => {
    if (job) {
        console.error(`Job ${job.id} failed: ${err.message}`);
    } else {
        console.error(`A job failed with no details: ${err.message}`);
    }
});