const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';

function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = window.location.origin;
  const basePath = process.env.NODE_ENV === 'production' ? '/juego-del-pakete' : '';
  return `${baseUrl}${basePath}/callback`;
}
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function redirectToSpotifyAuth(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: getRedirectUri(),
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getAccessToken(code: string): Promise<{ token: string | null; error: string | null }> {
  const codeVerifier = localStorage.getItem('code_verifier');

  if (!codeVerifier) {
    return { token: null, error: 'No se encontro el code verifier. Intenta iniciar sesion de nuevo.' };
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
      localStorage.removeItem('code_verifier');
      return { token: data.access_token, error: null };
    }

    return { token: null, error: `${data.error}: ${data.error_description}` };
  } catch (err) {
    return { token: null, error: `Error de red: ${err}` };
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');

  if (!refreshToken) {
    return null;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
    return data.access_token;
  }

  return null;
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (token && expiry && Date.now() < parseInt(expiry)) {
    return token;
  }

  return null;
}

export function logout(): void {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expiry');
}
