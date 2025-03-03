import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File, Fields, Files } from 'formidable';
import { supabase } from '../../lib/supabase';
import { Queue } from 'bullmq';
import { readFileSync } from 'fs';

export const config = {
  api: { bodyParser: false },
};

const queue = new Queue('log-processing-queue', {
  connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({ multiples: false });

  try {
    const { files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Explicitly type 'file' with 'File' to use the imported type
    const file: File | undefined = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = `logs/${user.id}/${Date.now()}-${file.originalFilename}`;
    const fileBuffer = readFileSync(file.filepath);
    const { error: uploadError } = await supabase.storage
      .from('log-files')
      .upload(filePath, fileBuffer);

    if (uploadError) return res.status(500).json({ error: 'Failed to upload file' });

    const job = await queue.add(
      'process-log',
      {
        fileId: filePath,
        filePath,
        userId: user.id,
      },
      { attempts: 3, priority: file.size < 1000000 ? 1 : 2 }
    );

    return res.status(200).json({ jobId: job.id });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'File upload failed' });
  }
}