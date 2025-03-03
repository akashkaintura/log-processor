import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { jobId } = req.query;
    const { data, error: fetchError } = await supabase
        .from('log_stats')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .single();

    if (fetchError) return res.status(500).json({ error: 'Failed to fetch stats' });
    res.status(200).json(data);
}