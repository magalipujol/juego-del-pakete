'use client';

import { useEffect, useState } from 'react';
import { redirectToSpotifyAuth, getStoredToken } from './lib/spotify-auth';
import SpotifyPlayer from './components/SpotifyPlayer';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirigir de localhost a 127.0.0.1 para mantener consistencia con Spotify redirect URI
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      window.location.href = window.location.href.replace('localhost', '127.0.0.1');
      return;
    }

    const token = getStoredToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    redirectToSpotifyAuth();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-green-500 mb-4">
            Juego del Pakete
          </h1>
          <p className="text-lg text-zinc-400 mb-8">
            Reproduce una cancion y se pausara en un momento aleatorio.
            Configura entre que segundos quieres que ocurra.
          </p>

          <div className="bg-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Como funciona:</h2>
            <ol className="text-left text-zinc-400 space-y-2">
              <li>1. Conecta tu cuenta de Spotify Premium</li>
              <li>2. Busca y selecciona una cancion</li>
              <li>3. Configura el rango de segundos (X a Y)</li>
              <li>4. Presiona &quot;Iniciar Juego&quot;</li>
              <li>5. La musica se pausara en un segundo aleatorio</li>
            </ol>
          </div>

          <button
            onClick={handleLogin}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-green-600 rounded-full hover:bg-green-500 transition font-semibold text-lg"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Conectar con Spotify
          </button>

          <p className="mt-4 text-sm text-zinc-500">
            Requiere una cuenta de Spotify Premium
          </p>
        </div>
      </div>
    );
  }

  return <SpotifyPlayer onLogout={handleLogout} />;
}
