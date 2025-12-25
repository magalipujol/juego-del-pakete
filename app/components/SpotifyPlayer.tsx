'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getStoredToken, refreshAccessToken, logout } from '../lib/spotify-auth';

interface SpotifyPlayerProps {
  onLogout: () => void;
}

interface Track {
  name: string;
  artists: string;
  albumImage: string;
  duration: number;
}

export default function SpotifyPlayer({ onLogout }: SpotifyPlayerProps) {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [minSeconds, setMinSeconds] = useState(10);
  const [maxSeconds, setMaxSeconds] = useState(30);
  const [pauseAt, setPauseAt] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ uri: string; name: string; artists: string; image: string }>>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    let token = getStoredToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    return token;
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = async () => {
      const token = await getToken();
      if (!token) {
        onLogout();
        return;
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Juego del Pakete',
        getOAuthToken: async (cb) => {
          const t = await getToken();
          if (t) cb(t);
        },
        volume: 0.5,
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;

        setIsPlaying(!state.paused);
        setPosition(state.position);

        const track = state.track_window.current_track;
        setCurrentTrack({
          name: track.name,
          artists: track.artists.map(a => a.name).join(', '),
          albumImage: track.album.images[0]?.url || '',
          duration: track.duration_ms,
        });
      });

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Initialization error:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Authentication error:', message);
        onLogout();
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Account error:', message);
        setMessage('Se necesita Spotify Premium para usar el reproductor');
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [getToken, onLogout]);

  useEffect(() => {
    if (isPlaying && player) {
      intervalRef.current = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state) {
          setPosition(state.position);
        }
      }, 500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, player]);

  const searchTracks = async () => {
    if (!searchQuery.trim()) return;

    const token = await getToken();
    if (!token) return;

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();
    setSearchResults(
      data.tracks.items.map((track: { uri: string; name: string; artists: Array<{ name: string }>; album: { images: Array<{ url: string }> } }) => ({
        uri: track.uri,
        name: track.name,
        artists: track.artists.map((a) => a.name).join(', '),
        image: track.album.images[2]?.url || '',
      }))
    );
  };

  const playTrack = async (uri: string) => {
    const token = await getToken();
    if (!token || !deviceId) return;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });

    setSearchResults([]);
    setSearchQuery('');
  };

  const startGame = async () => {
    if (!player || !isPlaying) {
      setMessage('Primero selecciona y reproduce una cancion');
      return;
    }

    if (minSeconds >= maxSeconds) {
      setMessage('El segundo minimo debe ser menor que el maximo');
      return;
    }

    const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    const pauseAtMs = randomSeconds * 1000;

    await player.seek(0);
    await player.resume();

    setPauseAt(pauseAtMs);
    setGameActive(true);
    setMessage('¡Juego en curso!');

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(async () => {
      await player.pause();
      setGameActive(false);
      setMessage('¡Pausado!');
      setPauseAt(null);
    }, pauseAtMs);
  };

  const stopGame = async () => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    if (player) {
      await player.pause();
    }
    setGameActive(false);
    setPauseAt(null);
    setMessage('Juego detenido');
  };

  const continueGame = async () => {
    if (!player) {
      setMessage('El reproductor no esta listo');
      return;
    }

    if (minSeconds >= maxSeconds) {
      setMessage('El segundo minimo debe ser menor que el maximo');
      return;
    }

    const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    const pauseInMs = randomSeconds * 1000;

    await player.resume();

    setPauseAt(position + pauseInMs);
    setGameActive(true);
    setMessage('Continuando...');

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(async () => {
      await player.pause();
      setGameActive(false);
      setMessage('¡Pausado!');
      setPauseAt(null);
    }, pauseInMs);
  };

  const handleLogout = () => {
    if (player) {
      player.disconnect();
    }
    logout();
    onLogout();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-lg">Conectando con Spotify...</p>
        {message && <p className="text-red-500 mt-4">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-8 gap-6">
      <div className="flex justify-between w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-green-500">Juego del Pakete</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition"
        >
          Cerrar sesion
        </button>
      </div>

      {/* Search */}
      <div className="w-full max-w-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchTracks()}
            placeholder="Buscar cancion..."
            className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-green-500 focus:outline-none"
          />
          <button
            onClick={searchTracks}
            className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition font-medium"
          >
            Buscar
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-zinc-800 rounded-lg overflow-hidden">
            {searchResults.map((track) => (
              <button
                key={track.uri}
                onClick={() => playTrack(track.uri)}
                className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition text-left"
              >
                {track.image && (
                  <img src={track.image} alt="" className="w-10 h-10 rounded" />
                )}
                <div>
                  <p className="font-medium">{track.name}</p>
                  <p className="text-sm text-zinc-400">{track.artists}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Track */}
      {currentTrack && (
        <div className="w-full max-w-2xl bg-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            {currentTrack.albumImage && (
              <img
                src={currentTrack.albumImage}
                alt={currentTrack.name}
                className="w-24 h-24 rounded-lg shadow-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentTrack.name}</h2>
              <p className="text-zinc-400">{currentTrack.artists}</p>
              <div className="mt-2">
                <div className="flex justify-between text-sm text-zinc-400 mb-1">
                  <span>{formatTime(position)}</span>
                  <span>{formatTime(currentTrack.duration)}</span>
                </div>
                <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(position / currentTrack.duration) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => player?.togglePlay()}
              className="w-14 h-14 flex items-center justify-center bg-green-500 rounded-full hover:bg-green-400 transition"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="w-full max-w-2xl bg-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Configuracion del Juego</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Segundo minimo (X)
            </label>
            <input
              type="number"
              value={minSeconds}
              onChange={(e) => setMinSeconds(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 bg-zinc-700 rounded-lg border border-zinc-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Segundo maximo (Y)
            </label>
            <input
              type="number"
              value={maxSeconds}
              onChange={(e) => setMaxSeconds(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 bg-zinc-700 rounded-lg border border-zinc-600 focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          La musica se pausara en un segundo aleatorio entre {minSeconds}s y {maxSeconds}s
        </p>

        <div className="flex gap-4">
          <button
            onClick={startGame}
            className="flex-1 px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 transition font-medium"
          >
            {gameActive ? 'Reiniciar' : 'Iniciar Juego'}
          </button>
          {!gameActive && currentTrack && (
            <button
              onClick={continueGame}
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition font-medium"
            >
              Continuar
            </button>
          )}
        </div>

        {message && (
          <p className="mt-4 text-center text-zinc-300 bg-zinc-700 rounded-lg p-3">
            {message}
          </p>
        )}
      </div>

    </div>
  );
}
