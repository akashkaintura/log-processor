import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
    const session = useSession();
    const supabase = useSupabaseClient();
    const router = useRouter();

    useEffect(() => {
        if (session) router.push('/dashboard');
    }, [session, router]);

    const signIn = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'github' });
    };

    return (
        <div>
            <h1>Log Processing App</h1>
            <button onClick={signIn}>Login with GitHub</button>
        </div>
    );
}