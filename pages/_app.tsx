import { AppProps } from 'next/app';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function MyApp({ Component, pageProps }: AppProps) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Anon Key:', supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
        );
    }

    const supabaseClient = createClientComponentClient({
        supabaseUrl,
        supabaseKey,
    });

    return (
        <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
            <Component {...pageProps} />
        </SessionContextProvider>
    );
}