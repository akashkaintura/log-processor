import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';

interface LogStat {
    id: string;
    job_id: string;
    user_id: string;
    file_id: string;
    errors: number;
    keywords: Record<string, number>;
    ips: Record<string, number>;
    created_at: string;
}

export default function Dashboard() {
    const session = useSession();
    const supabase = useSupabaseClient();
    const router = useRouter();
    // Replace any[] with LogStat[]
    const [stats, setStats] = useState<LogStat[]>([]);

    useEffect(() => {
        if (!session) {
            router.push('/');
            return;
        }

        fetchStats();

        const socket: Socket = io();
        socket.on('jobCompleted', async (data: { jobId: string }) => {
            const { data: newStat, error } = await supabase
                .from('log_stats')
                .select('*')
                .eq('job_id', data.jobId)
                .single();

            if (error) {
                console.error('Error fetching new stat:', error);
                return;
            }

            if (newStat) {
                setStats((prev) => [...prev, newStat as LogStat]);
            }
        });

        // Cleanup function
        return () => {
            socket.disconnect();
        };
    }, [session, router, supabase]);

    const fetchStats = async () => {
        const { data, error } = await supabase.from('log_stats').select('*');
        if (error) {
            console.error('Error fetching stats:', error);
            return;
        }
        setStats(data as LogStat[] || []);
    };

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Type the event target properly to avoid 'any'
        const target = e.target as HTMLFormElement;
        const fileInput = target.elements.namedItem('file') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload-logs', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session!.access_token}` },
            body: formData,
        });

        if (!res.ok) console.error('Upload failed');
    };

    if (!session) return null;

    return (
        <div>
            <h1>Dashboard</h1>
            <form onSubmit={handleUpload}>
                <input type="file" name="file" />
                <button type="submit">Upload</button>
            </form>
            <table>
                <thead>
                    <tr>
                        <th>Job ID</th>
                        <th>Errors</th>
                        <th>Keywords</th>
                        <th>IPs</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map((stat) => (
                        <tr key={stat.id}>
                            <td>{stat.job_id}</td>
                            <td>{stat.errors}</td>
                            <td>{JSON.stringify(stat.keywords)}</td>
                            <td>{JSON.stringify(stat.ips)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}