import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SettingsService } from './settings';
import { HistoryService, DownloadRecord } from './history';

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
  error?: string;
  logs: string[];
  addedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export class QueueService {
  private static queue: QueueItem[] = [];
  private static activeProcesses = new Map<string, ChildProcess>();
  private static ioInstance: any = null;

  public static setIoInstance(io: any) {
    this.ioInstance = io;
  }

  private static emitUpdate() {
    if (this.ioInstance) {
      this.ioInstance.emit('queue-update', this.getQueue());
    }
  }

  private static emitLog(itemId: string, logLine: string) {
    if (this.ioInstance) {
      this.ioInstance.emit('download-log', { itemId, log: logLine });
    }
  }

  public static getQueue(): QueueItem[] {
    // Hide process handles, return serialization safe data
    return this.queue.map(item => ({ ...item }));
  }

  public static getQueueItem(id: string): QueueItem | null {
    return this.queue.find(item => item.id === id) || null;
  }

  public static async addToQueue(url: string, platform: string, options: { format?: string; title?: string } = {}): Promise<QueueItem> {
    const settings = SettingsService.getSettings();
    
    // Auto detect platform if not provided
    let detectedPlatform = platform || 'youtube';
    if (url.includes('instagram.com')) {
      detectedPlatform = 'instagram';
    } else if (url.includes('tiktok.com')) {
      detectedPlatform = 'tiktok';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      detectedPlatform = 'twitter';
    }

    // Check size limit
    if (this.queue.length >= settings.maxQueueSize) {
      throw new Error(`Queue size limit of ${settings.maxQueueSize} reached.`);
    }

    const newItem: QueueItem = {
      id: uuidv4(),
      url,
      platform: detectedPlatform,
      title: options.title || 'Fetching metadata...',
      status: 'Queued',
      progress: 0,
      speed: '0 B/s',
      eta: '--:--',
      downloadedMb: '0 MB',
      totalMb: '0 MB',
      fileName: '',
      downloadPath: settings.downloadFolder,
      format: options.format || settings.defaultVideoQuality,
      logs: ['Added to queue.'],
      addedAt: new Date().toISOString()
    };

    this.queue.push(newItem);
    this.emitUpdate();
    
    // Trigger queue processing in background
    this.processQueue();

    return newItem;
  }

  public static cancelDownload(id: string): boolean {
    const item = this.queue.find(x => x.id === id);
    if (!item) return false;

    if (item.status === 'Downloading' || item.status === 'Analyzing') {
      const proc = this.activeProcesses.get(id);
      if (proc) {
        // Kill the spawned process tree
        proc.kill('SIGTERM');
        this.activeProcesses.delete(id);
      }
      item.status = 'Cancelled';
      item.logs.push('Download cancelled by user.');
      item.speed = '0 B/s';
      item.eta = '--:--';
    } else if (item.status === 'Queued' || item.status === 'Waiting') {
      item.status = 'Cancelled';
      item.logs.push('Queue item cancelled by user.');
    } else {
      return false;
    }

    this.emitUpdate();
    this.processQueue();
    return true;
  }

  public static retryDownload(id: string): boolean {
    const item = this.queue.find(x => x.id === id);
    if (!item) return false;

    if (item.status === 'Failed' || item.status === 'Cancelled' || item.status === 'Skipped') {
      item.status = 'Queued';
      item.progress = 0;
      item.speed = '0 B/s';
      item.eta = '--:--';
      item.error = undefined;
      item.logs = ['Re-added to queue for retry.'];
      item.addedAt = new Date().toISOString();
      
      this.emitUpdate();
      this.processQueue();
      return true;
    }
    return false;
  }

  public static deleteQueueItem(id: string): boolean {
    // If running, cancel first
    this.cancelDownload(id);
    const index = this.queue.findIndex(x => x.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.emitUpdate();
      return true;
    }
    return false;
  }

  public static clearQueue(): void {
    // Cancel all running ones
    for (const item of this.queue) {
      if (item.status === 'Downloading' || item.status === 'Analyzing' || item.status === 'Queued' || item.status === 'Waiting') {
        this.cancelDownload(item.id);
      }
    }
    this.queue = [];
    this.emitUpdate();
  }

  private static getRunningCount(): number {
    return this.queue.filter(x => x.status === 'Downloading' || x.status === 'Analyzing').length;
  }

  public static processQueue() {
    const settings = SettingsService.getSettings();
    const running = this.getRunningCount();
    const limit = settings.concurrentDownloads;

    if (running >= limit) {
      // Limit reached, wait
      return;
    }

    // Find next Queued item
    const nextItem = this.queue.find(x => x.status === 'Queued');
    if (!nextItem) return;

    // Start it!
    this.startDownload(nextItem);
    
    // Check if we can process another one
    this.processQueue();
  }

  private static async startDownload(item: QueueItem) {
    const settings = SettingsService.getSettings();
    item.status = 'Analyzing';
    item.startedAt = new Date().toISOString();
    item.logs.push('Starting analysis and download...');
    this.emitUpdate();

    try {
      // 1. Analyze metadata to get title and verify duplicate check
      const metadata = await this.fetchMetadata(item.url);
      item.title = metadata.title || item.title;
      item.logs.push(`Title resolved: "${item.title}"`);
      this.emitUpdate();

      // Check duplicates
      const dup = HistoryService.checkDuplicate(item.title, item.url);
      if (dup && settings.duplicateHandling === 'skip') {
        item.status = 'Skipped';
        item.logs.push(`Skipped automatically (Duplicate found in history: file '${dup.fileName}' downloaded on ${new Date(dup.downloadedAt).toLocaleDateString()})`);
        this.emitUpdate();
        this.processQueue();
        return;
      }
      
      // If we are set to ask, and this isn't a force download, we might hold the status.
      // However, the frontend will call /api/duplicate-check first.
      // If it bypasses or is added directly, we proceed with normal overwrite or rename settings
      let outputName = settings.defaultOutputTemplate;
      if (dup && settings.duplicateHandling === 'rename') {
        outputName = `%(title)s_dup_${Date.now()}.%(ext)s`;
        item.logs.push('Duplicate handling set to rename. Appended timestamp suffix to filename template.');
      }

      // 2. Start yt-dlp download
      item.status = 'Downloading';
      this.emitUpdate();

      // Formulate command args
      const args: string[] = [
        item.url,
        '-o', path.join(settings.downloadFolder, outputName),
        '--no-colors',
        '--progress',
        '--newline',
        '--js-runtimes', 'node',
        '--remote-components', 'ejs:github'
      ];
      if (settings.ffmpegPath && settings.ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', settings.ffmpegPath);
      }
      if (settings.cookiesFilePath && settings.cookiesFilePath.trim() !== '') {
        args.push('--cookies', settings.cookiesFilePath.trim());
      } else if (settings.cookieBrowser && settings.cookieBrowser !== 'none') {
        args.push('--cookies-from-browser', settings.cookieBrowser);
      }

      // Add format configurations
      const format = item.format || 'best';
      const hasFfmpeg = !!settings.ffmpegPath;
      
      if (format === 'mp3_320') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (format === 'mp3_128') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '5');
      } else if (format === 'm4a') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'm4a');
      } else if (format === 'wav') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'wav');
      } else if (format.startsWith('mp4_')) {
        const height = format.split('_')[1].replace('p', '');
        if (hasFfmpeg) {
          args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
          args.push('--merge-output-format', 'mp4');
        } else {
          // No ffmpeg: use pre-merged single-stream format only
          args.push('-f', `best[height<=${height}]/best`);
        }
      } else if (format === 'best') {
        if (hasFfmpeg) {
          args.push('-f', 'bestvideo+bestaudio/best');
          args.push('--merge-output-format', 'mp4');
        } else {
          args.push('-f', 'best');
        }
      } else {
        args.push('-f', format);
      }

      // Add subtitle configurations if applicable
      if (settings.subtitlePreferences) {
        args.push('--write-subs', '--sub-langs', settings.subtitlePreferences, '--embed-subs');
      }

      item.logs.push(`Spawning yt-dlp with arguments: ${args.join(' ')}`);

      // Spawn process
      const child = spawn(settings.ytdlpPath, args);
      this.activeProcesses.set(item.id, child);

      // Log file stream
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logStream = fs.createWriteStream(path.join(logDir, `${item.id}.log`), { flags: 'a' });

      let stderrAccumulator = '';

      child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          // Save in logs array and write to stream
          item.logs.push(line);
          logStream.write(`${new Date().toISOString()} [STDOUT] ${line}\n`);
          this.emitLog(item.id, line);

          // Parse progress: "[download]  10.2% of ~15.54MiB at  3.45MiB/s ETA 00:04"
          // Or: "[download]  50.0% of 100.00MiB at 10.00MiB/s ETA 00:05"
          const progressRegex = /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?(\d+(?:\.\d+)?\w+)\s+at\s+(\d+(?:\.\d+)?\w+\/s)\s+ETA\s+(\d+(?::\d+)+)/i;
          const match = line.match(progressRegex);
          if (match) {
            item.progress = parseFloat(match[1]);
            item.totalMb = match[2];
            item.speed = match[3];
            item.eta = match[4];
            item.downloadedMb = `${((item.progress / 100) * parseFloat(item.totalMb)).toFixed(1)} ${item.totalMb.replace(/[\d\.]/g, '')}`;
            this.emitUpdate();
          }

          // Parse Destination: "[download] Destination: D:\downloads\filename.mp4"
          const destRegex = /\[download\]\s+Destination:\s+(.*)/i;
          const destMatch = line.match(destRegex);
          if (destMatch) {
            item.fileName = path.basename(destMatch[1]);
            item.downloadPath = destMatch[1];
            this.emitUpdate();
          }
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderrAccumulator += text;
        const lines = text.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          item.logs.push(`[ERROR] ${line}`);
          logStream.write(`${new Date().toISOString()} [STDERR] ${line}\n`);
          this.emitLog(item.id, `[ERROR] ${line}`);
        }
      });

      child.on('close', async (code) => {
        this.activeProcesses.delete(item.id);
        logStream.end();

        if (code === 0) {
          item.status = 'Completed';
          item.progress = 100;
          item.speed = '0 B/s';
          item.eta = '00:00';
          item.finishedAt = new Date().toISOString();
          item.logs.push('Finished download successfully.');

          // If we couldn't parse the destination filename, make an educated guess
          if (!item.fileName) {
            item.fileName = `${item.title.substring(0, 30)}.mp4`;
            item.downloadPath = path.join(settings.downloadFolder, item.fileName);
          }

          // Fetch size of file
          let sizeStr = item.totalMb || 'Unknown size';
          try {
            if (fs.existsSync(item.downloadPath)) {
              const fileStats = fs.statSync(item.downloadPath);
              sizeStr = `${(fileStats.size / (1024 * 1024)).toFixed(1)} MB`;
            }
          } catch (_) {}

          // Add to history
          const durationStr = metadata.duration ? `${Math.floor(metadata.duration / 60)}:${String(metadata.duration % 60).padStart(2, '0')}` : '0:00';
          const historyRecord: DownloadRecord = {
            id: item.id,
            title: item.title,
            normalizedTitle: HistoryService.normalizeTitle(item.title),
            url: item.url,
            platform: item.platform,
            downloadedAt: item.finishedAt,
            fileName: item.fileName,
            quality: item.format,
            downloadPath: item.downloadPath,
            duration: durationStr,
            hash: uuidv4(), // generate unique hash
            fileSize: sizeStr
          };
          HistoryService.addRecord(historyRecord);
          
          item.logs.push('Added item to history database.');
          this.emitUpdate();
        } else {
          // If state is already cancelled, don't override
          if (item.status !== 'Cancelled') {
            // Check if error is "Requested format is not available" - retry with universal fallback
            const hasFormatError = stderrAccumulator.includes('Requested format is not available') || item.logs.some(l => l.includes('Requested format is not available'));
            const alreadyFallback = item.logs.some(l => l.includes('[FALLBACK]'));
            
            if (hasFormatError && !alreadyFallback) {
              item.logs.push('[FALLBACK] Requested format unavailable. Retrying with universal fallback format...');
              this.emitUpdate();

              // Determine fallback format args based on original format intent
              const isAudioFormat = ['mp3_320', 'mp3_128', 'm4a', 'wav'].includes(item.format);
              const fallbackArgs: string[] = [
                item.url,
                '-o', path.join(settings.downloadFolder, settings.defaultOutputTemplate),
                '--no-colors', '--progress', '--newline',
                '--js-runtimes', 'node',
                '--remote-components', 'ejs:github'
              ];

              if (settings.ffmpegPath && settings.ffmpegPath !== 'ffmpeg') {
                fallbackArgs.push('--ffmpeg-location', settings.ffmpegPath);
              }
              if (settings.cookiesFilePath && settings.cookiesFilePath.trim() !== '') {
                fallbackArgs.push('--cookies', settings.cookiesFilePath.trim());
              } else if (settings.cookieBrowser && settings.cookieBrowser !== 'none') {
                fallbackArgs.push('--cookies-from-browser', settings.cookieBrowser);
              }

              if (isAudioFormat) {
                fallbackArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
              } else {
                // Simplest possible video fallback - no merge needed, just get what's available
                fallbackArgs.push('-f', 'best');
              }

              item.logs.push(`[FALLBACK] Spawning yt-dlp with fallback args: ${fallbackArgs.join(' ')}`);
              this.emitLog(item.id, '[FALLBACK] Spawning with fallback format...');
              this.emitUpdate();

              const fallbackChild = spawn(settings.ytdlpPath, fallbackArgs);
              this.activeProcesses.set(item.id, fallbackChild);

              const fallbackLogStream = fs.createWriteStream(path.join(__dirname, '..', 'logs', `${item.id}.log`), { flags: 'a' });

              fallbackChild.stdout.on('data', (data: Buffer) => {
                for (let line of data.toString().split('\n')) {
                  line = line.trim();
                  if (!line) continue;
                  item.logs.push(line);
                  fallbackLogStream.write(`${new Date().toISOString()} [FALLBACK-STDOUT] ${line}\n`);
                  this.emitLog(item.id, line);

                  const progressRegex = /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?(\d+(?:\.\d+)?\w+)\s+at\s+(\d+(?:\.\d+)?\w+\/s)\s+ETA\s+(\d+(?::\d+)+)/i;
                  const match = line.match(progressRegex);
                  if (match) {
                    item.progress = parseFloat(match[1]);
                    item.totalMb = match[2];
                    item.speed = match[3];
                    item.eta = match[4];
                    this.emitUpdate();
                  }
                  const destMatch = line.match(/\[download\]\s+Destination:\s+(.*)/i);
                  if (destMatch) {
                    item.fileName = path.basename(destMatch[1]);
                    item.downloadPath = destMatch[1];
                    this.emitUpdate();
                  }
                }
              });
              fallbackChild.stderr.on('data', (data: Buffer) => {
                for (let line of data.toString().split('\n')) {
                  line = line.trim();
                  if (!line) continue;
                  item.logs.push(`[ERROR] ${line}`);
                  fallbackLogStream.write(`${new Date().toISOString()} [FALLBACK-STDERR] ${line}\n`);
                  this.emitLog(item.id, `[ERROR] ${line}`);
                }
              });
              fallbackChild.on('close', (fallbackCode) => {
                this.activeProcesses.delete(item.id);
                fallbackLogStream.end();
                if (fallbackCode === 0) {
                  item.status = 'Completed';
                  item.progress = 100;
                  item.speed = '0 B/s';
                  item.eta = '00:00';
                  item.finishedAt = new Date().toISOString();
                  item.logs.push('Finished download successfully (via fallback format).');
                  if (!item.fileName) {
                    item.fileName = `${item.title.substring(0, 30)}.mp4`;
                    item.downloadPath = path.join(settings.downloadFolder, item.fileName);
                  }
                  HistoryService.addRecord({
                    id: item.id, title: item.title, normalizedTitle: HistoryService.normalizeTitle(item.title),
                    url: item.url, platform: item.platform, downloadedAt: item.finishedAt,
                    fileName: item.fileName, quality: item.format + ' (fallback)',
                    downloadPath: item.downloadPath, duration: '0:00', hash: uuidv4(), fileSize: item.totalMb || 'Unknown'
                  });
                  item.logs.push('Added item to history database.');
                } else {
                  item.status = 'Failed';
                  item.error = 'Fallback download also failed. yt-dlp exited with code ' + fallbackCode;
                  item.logs.push(`Error: Fallback also failed with code ${fallbackCode}.`);
                }
                this.emitUpdate();
                this.processQueue();
              });
              return; // Don't call processQueue now; it will be called from fallback close
            }

            item.status = 'Failed';
            item.error = 'yt-dlp exited with non-zero code ' + code;
            item.logs.push(`Error: yt-dlp exited with code ${code}.`);
            this.emitUpdate();
          }
        }
        
        // Process next in queue
        this.processQueue();
      });

    } catch (error: any) {
      item.status = 'Failed';
      item.error = error?.message || 'Unknown error during analysis';
      item.logs.push(`Fatal Error: ${item.error}`);
      this.emitUpdate();
      this.processQueue();
    }
  }

  // Wrapper around yt-dlp --dump-json to fetch metadata
  public static fetchMetadata(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const settings = SettingsService.getSettings();
      // Run dump-json
      const args = [url, '--dump-json', '--no-warnings', '--js-runtimes', 'node', '--remote-components', 'ejs:github'];
      if (settings.ffmpegPath && settings.ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', settings.ffmpegPath);
      }
      if (settings.cookiesFilePath && settings.cookiesFilePath.trim() !== '') {
        args.push('--cookies', settings.cookiesFilePath.trim());
      } else if (settings.cookieBrowser && settings.cookieBrowser !== 'none') {
        args.push('--cookies-from-browser', settings.cookieBrowser);
      }
      
      const child = spawn(settings.ytdlpPath, args);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const json = JSON.parse(stdoutData);
            resolve(json);
          } catch (e) {
            reject(new Error('Failed to parse metadata JSON response'));
          }
        } else {
          reject(new Error(stderrData.trim() || `Metadata analysis exited with code ${code}`));
        }
      });
    });
  }
}
