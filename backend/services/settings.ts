import fs from 'fs';
import path from 'path';

export interface AppSettings {
  downloadFolder: string;
  defaultVideoQuality: string;
  defaultAudioQuality: string;
  theme: string;
  concurrentDownloads: number;
  maxQueueSize: number;
  autoRetry: boolean;
  retryCount: number;
  duplicateHandling: 'ask' | 'skip' | 'overwrite' | 'rename';
  defaultOutputTemplate: string;
  subtitlePreferences: string;
  ffmpegPath: string;
  ytdlpPath: string;
  autoUpdateYtdlp: boolean;
  cookieBrowser: string;
  cookiesFilePath: string;
}

const SETTINGS_PATH = path.join(__dirname, '..', 'settings', 'settings.json');

export class SettingsService {
  private static cachedSettings: AppSettings | null = null;

  public static getSettings(): AppSettings {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
        this.cachedSettings = JSON.parse(data);
        return this.cachedSettings!;
      }
    } catch (error) {
      console.error('Failed to read settings file, returning defaults', error);
    }

    // Default Fallback
    const defaults: AppSettings = {
      downloadFolder: path.join(__dirname, '..', 'downloads'),
      defaultVideoQuality: 'bestvideo+bestaudio/best',
      defaultAudioQuality: 'bestaudio/best',
      theme: 'dark',
      concurrentDownloads: 3,
      maxQueueSize: 50,
      autoRetry: true,
      retryCount: 3,
      duplicateHandling: 'ask',
      defaultOutputTemplate: '%(title)s.%(ext)s',
      subtitlePreferences: 'en',
      ffmpegPath: 'ffmpeg',
      ytdlpPath: 'yt-dlp',
      autoUpdateYtdlp: false,
      cookieBrowser: 'none',
      cookiesFilePath: ''
    };

    return defaults;
  }

  public static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    
    // Ensure download folder exists
    try {
      if (!fs.existsSync(updated.downloadFolder)) {
        fs.mkdirSync(updated.downloadFolder, { recursive: true });
      }
    } catch (e) {
      console.error('Could not create custom download folder:', e);
    }

    try {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
      this.cachedSettings = updated;
    } catch (error) {
      console.error('Failed to write settings file', error);
    }

    return updated;
  }
}
