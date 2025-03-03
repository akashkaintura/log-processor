export interface LogStat {
    id: string;
    job_id: string;
    user_id: string;
    file_id: string;
    errors: number;
    keywords: Record<string, number>;
    ips: Record<string, number>;
    created_at: string;
}