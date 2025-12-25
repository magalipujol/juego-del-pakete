interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'player_state_changed', callback: (state: Spotify.PlaybackState | null) => void): void;
  addListener(event: 'initialization_error', callback: (error: { message: string }) => void): void;
  addListener(event: 'authentication_error', callback: (error: { message: string }) => void): void;
  addListener(event: 'account_error', callback: (error: { message: string }) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<Spotify.PlaybackState | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(position_ms: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getVolume(): Promise<number>;
}

declare namespace Spotify {
  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
        artists: Array<{ name: string; uri: string }>;
        album: {
          name: string;
          uri: string;
          images: Array<{ url: string; height: number; width: number }>;
        };
      };
      previous_tracks: Array<unknown>;
      next_tracks: Array<unknown>;
    };
  }

  class Player implements SpotifyPlayer {
    constructor(options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    });
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): void;
    addListener(event: 'initialization_error', callback: (error: { message: string }) => void): void;
    addListener(event: 'authentication_error', callback: (error: { message: string }) => void): void;
    addListener(event: 'account_error', callback: (error: { message: string }) => void): void;
    addListener(event: string, callback: (data: unknown) => void): void;
    removeListener(event: string): void;
    getCurrentState(): Promise<PlaybackState | null>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getVolume(): Promise<number>;
  }
}

interface Window {
  Spotify: typeof Spotify;
  onSpotifyWebPlaybackSDKReady: () => void;
}
