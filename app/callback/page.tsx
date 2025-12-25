'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessToken } from '../lib/spotify-auth';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Error de autorizacion: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('No se recibio el codigo de autorizacion');
        return;
      }

      const result = await getAccessToken(code);

      if (result.token) {
        router.push('/');
      } else {
        setError(result.error || 'No se pudo obtener el token de acceso');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md">
          <h1 className="text-xl font-bold text-red-400 mb-2">Error</h1>
          <p className="text-zinc-300">{error}</p>
          <button
            onClick={() => window.location.href = 'http://127.0.0.1:3000'}
            className="mt-4 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
      <p className="text-lg">Autenticando con Spotify...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-lg">Cargando...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
