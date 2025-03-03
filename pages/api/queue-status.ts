import type { NextApiRequest, NextApiResponse } from 'next';
import { Queue } from 'bullmq';

const queue = new Queue('log-processing-queue', {
    connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const counts = await queue.getJobCounts();
    res.status(200).json(counts);
}