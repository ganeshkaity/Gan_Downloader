import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { SettingsService } from './services/settings';
import { HistoryService } from './services/history';
import { HealthService } from './services/health';
import { QueueService } from './services/queue';
import { spawn, exec } from 'child_process';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*', // For local dev, allow any frontend port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Setup HTTP Server & Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Bind io to QueueService for real-time updates
QueueService.setIoInstance(io);

// Track connected clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Send current queue immediately
  socket.emit('queue-update', QueueService.getQueue());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper wrapper to support /api/ prefixes alongside root URLs
const route = (pathStr: string, handler: express.RequestHandler, method: 'get' | 'post' | 'delete' = 'post') => {
  if (method === 'post') {
    app.post(pathStr, handler);
    app.post(`/api${pathStr}`, handler);
  } else if (method === 'get') {
    app.get(pathStr, handler);
    app.get(`/api${pathStr}`, handler);
  } else if (method === 'delete') {
    app.delete(pathStr, handler);
    app.delete(`/api${pathStr}`, handler);
  }
};

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// GET /health - System & internet health checks
route('/health', async (req, res) => {
  try {
    const health = await HealthService.getHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to retrieve health metrics' });
  }
}, 'get');

// POST /analyze - Scrapes metadata from a single video
route('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const metadata = await QueueService.fetchMetadata(url);
    const duplicate = HistoryService.checkDuplicate(metadata.title, url);
    res.json({
      success: true,
      metadata: {
        title: metadata.title,
        uploader: metadata.uploader,
        duration: metadata.duration,
        views: metadata.view_count,
        uploadDate: metadata.upload_date,
        thumbnail: metadata.thumbnail,
        webpage_url: metadata.webpage_url,
        formats: (metadata.formats || []).map((f: any) => ({
          formatId: f.format_id,
          ext: f.ext,
          resolution: f.resolution || `${f.width || '?'}x${f.height || '?'}`,
          note: f.format_note || f.note || '',
          filesize: f.filesize || f.filesize_approx || null
        })).filter((f: any) => f.resolution !== 'multiple'),
        subtitles: Object.keys(metadata.subtitles || {}),
        automaticCaptions: Object.keys(metadata.automatic_captions || {})
      },
      duplicate: duplicate ? {
        title: duplicate.title,
        downloadedAt: duplicate.downloadedAt,
        fileName: duplicate.fileName,
        downloadPath: duplicate.downloadPath
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to analyze media' });
  }
});

// POST /playlist - Scrapes playlist metadata (flat mode)
route('/playlist', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const settings = SettingsService.getSettings();
    const args = [url, '--flat-playlist', '--dump-single-json', '--no-warnings', '--js-runtimes', 'node', '--remote-components', 'ejs:github'];
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

    child.stdout.on('data', (data) => stdoutData += data.toString());
    child.stderr.on('data', (data) => stderrData += data.toString());

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const playlist = JSON.parse(stdoutData);
          res.json({
            success: true,
            playlist: {
              title: playlist.title,
              uploader: playlist.uploader || playlist.channel || 'Unknown Creator',
              videoCount: (playlist.entries || []).length,
              entries: (playlist.entries || []).map((e: any) => ({
                id: e.id,
                title: e.title,
                url: e.url,
                duration: e.duration || 0,
                thumbnail: e.thumbnail || (playlist.thumbnails && playlist.thumbnails.length ? playlist.thumbnails[playlist.thumbnails.length - 1].url : null)
              }))
            }
          });
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse playlist metadata response' });
        }
      } else {
        res.status(500).json({ error: stderrData.trim() || 'Failed to retrieve playlist details' });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to execute playlist analysis' });
  }
});

// POST /search - Runs yt-dlp search
route('/search', async (req, res) => {
  const { query, limit = 20 } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const settings = SettingsService.getSettings();
    const searchUrl = `ytsearch${limit}:${query}`;
    const args = [searchUrl, '--flat-playlist', '--dump-single-json', '--no-warnings'];
    // Timeout so search doesn't hang forever
    args.push('--socket-timeout', '30');
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

    child.stdout.on('data', (data) => stdoutData += data.toString());
    child.stderr.on('data', (data) => stderrData += data.toString());

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const playlist = JSON.parse(stdoutData);
          res.json({
            success: true,
            results: (playlist.entries || []).map((e: any) => ({
              id: e.id,
              title: e.title,
              url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
              duration: e.duration || 0,
              thumbnail: e.thumbnail || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`
            }))
          });
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse search metadata response' });
        }
      } else {
        res.status(500).json({ error: stderrData.trim() || 'Failed to search YouTube' });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Search execution failed' });
  }
});

// POST /download - Add single URL to active download queue
route('/download', async (req, res) => {
  const { url, format, title, platform, embedMetadata, embedThumbnail, subLangs } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const item = await QueueService.addToQueue(url, platform || 'youtube', { format, title, embedMetadata, embedThumbnail, subLangs });
    res.json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to add item to queue' });
  }
});

// POST /multiple - Add multiple URLs to queue
route('/multiple', async (req, res) => {
  const { urls, format, embedMetadata, embedThumbnail } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'List of URLs is required' });
  }

  try {
    const items = [];
    for (const url of urls) {
      if (url.trim()) {
        const item = await QueueService.addToQueue(url.trim(), 'youtube', { format, embedMetadata, embedThumbnail });
        items.push(item);
      }
    }
    res.json({ success: true, count: items.length, items });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to add multiple items to queue' });
  }
});

// POST /instagram - Wrapper for instagram downloader endpoint
route('/instagram', async (req, res) => {
  const { url, format, title, embedMetadata, embedThumbnail } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const item = await QueueService.addToQueue(url, 'instagram', { format, title, embedMetadata, embedThumbnail });
    res.json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to add Instagram item to queue' });
  }
});

// POST /duplicate-check - Query downloads database for duplicates
route('/duplicate-check', (req, res) => {
  const { title, url } = req.body;
  if (!title && !url) {
    return res.status(400).json({ error: 'title or url is required' });
  }

  const dup = HistoryService.checkDuplicate(title || '', url || '');
  res.json({ duplicate: !!dup, record: dup });
});

// GET /history - Get all history items
route('/history', (req, res) => {
  const history = HistoryService.getHistory();
  res.json(history);
}, 'get');

// POST /history - Import complete history array
route('/history', (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Valid history records array is required' });
  }

  try {
    const imported = HistoryService.importHistory(records);
    res.json({ success: true, count: imported.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to import history' });
  }
});

// DELETE /history - Clear history or delete specific item
route('/history', (req, res) => {
  const { id } = req.body;
  if (id) {
    const updated = HistoryService.deleteRecord(id);
    res.json({ success: true, count: updated.length });
  } else {
    const updated = HistoryService.clearHistory();
    res.json({ success: true, count: updated.length });
  }
}, 'delete');

// POST /open-folder - Opens Windows Explorer and highlights the file
route('/open-folder', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  // Escape double quotes to prevent CLI injection
  const escapedPath = filePath.replace(/"/g, '\\"');

  exec(`explorer.exe /select,"${escapedPath}"`, (err) => {
    if (err) {
      console.error('Failed to run explorer.exe:', err);
      return res.status(500).json({ error: 'Failed to open file folder' });
    }
    res.json({ success: true });
  });
});

// GET /queue - Get current queue
route('/queue', (req, res) => {
  res.json(QueueService.getQueue());
}, 'get');

// POST /cancel - Cancel a queue item
route('/cancel', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Queue item ID is required' });
  }

  const success = QueueService.cancelDownload(id);
  res.json({ success });
});

// POST /retry - Retry a failed/cancelled queue item
route('/retry', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Queue item ID is required' });
  }

  const success = QueueService.retryDownload(id);
  res.json({ success });
});

// GET /settings - Fetch application settings
route('/settings', (req, res) => {
  res.json(SettingsService.getSettings());
}, 'get');

// POST /settings - Update application settings
route('/settings', (req, res) => {
  const updated = SettingsService.saveSettings(req.body);
  res.json(updated);
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server
httpServer.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
  console.log(`Realtime updates running via Socket.io`);
});
