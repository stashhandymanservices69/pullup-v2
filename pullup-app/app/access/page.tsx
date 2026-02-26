"use client";

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AccessForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextPath = searchParams.get('next') || '/';

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/access/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                setError('Incorrect access code. Please try again.');
                return;
            }

            router.replace(nextPath.startsWith('/') ? nextPath : '/');
            router.refresh();
        } catch {
            setError('Unable to unlock right now. Please retry in a moment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-stone-950 text-white relative overflow-hidden flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=60')] bg-cover bg-center opacity-30" />
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-stone-900/80 border border-stone-700 rounded-3xl p-8 shadow-2xl text-center">
                <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
                <h1 className="font-serif text-4xl mb-2">Pull Up Coffee™</h1>
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-300 font-bold mb-7">Beta Access Restricted</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        type="password"
                        autoComplete="one-time-code"
                        placeholder="Enter Access Code"
                        className="w-full rounded-xl bg-stone-800 border border-orange-500/80 px-5 py-4 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-orange-500 hover:bg-orange-600 transition rounded-xl py-4 font-bold text-lg disabled:opacity-60"
                    >
                        {isSubmitting ? 'Unlocking...' : 'Unlock'}
                    </button>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </form>
            </div>
        </main>
    );
}

export default function AccessPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-stone-950" />}>
            <AccessForm />
        </Suspense>
    );
}
