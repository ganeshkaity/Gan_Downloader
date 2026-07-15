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
}

export interface DownloadRecord {
  id: string;
  title: string;
  normalizedTitle: string;
  url: string;
  platform: string;
  downloadedAt: string;
  fileName: string;
  quality: string;
  downloadPath: string;
  duration: string;
  hash: string;
  fileSize?: string;
}

export interface HealthStatus {
  backendOnline: boolean;
  ytdlpInstalled: boolean;
  pythonInstalled: boolean;
  ffmpegInstalled: boolean;
  internetAvailable: boolean;
  youtubeReachable: boolean;
  dnsReachable: boolean;
  diskSpace: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percentageUsed: number;
  };
  cpuUsage: number;
  memoryUsage: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percentageUsed: number;
  };
  version: string;
  lastPing: string;
  latency: number;
}

export interface QueueItem {
  id: string;
  url: string;
  platform: string;
  title: string;
  status: 'Queued' | 'Waiting' | 'Analyzing' | 'Downloading' | 'Paused' | 'Completed' | 'Cancelled' | 'Failed' | 'Skipped';
  progress: number;
  speed: string;
  eta: string;
  downloadedMb: string;
  totalMb: string;
  fileName: string;
  downloadPath: string;
  format: string;
  embedMetadata?: boolean;
  embedThumbnail?: boolean;
  subLangs?: string[];
  error?: string;
  logs: string[];
  addedAt: string;
  startedAt?: string;
  finishedAt?: string;
}
