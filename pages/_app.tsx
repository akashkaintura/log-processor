import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
    const supabaseClient = createClientComponentClient();

    return (
        <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
            <Component {...pageProps} />
        </SessionContextProvider>
    );
}