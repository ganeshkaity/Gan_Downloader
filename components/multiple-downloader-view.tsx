'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { 
  Download, 
  Play, 
  Pause, 
  X, 
  RefreshCw, 
  Trash2, 
  Globe, 
  ListPlus,
  AlertCircle 
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from './icons';

export default function MultipleDownloaderView() {
  const { queue, addToQueue, cancelDownload, retryDownload, deleteQueueItem, clearQueue, health, connected } = useAppStore();
  const [urlsInput, setUrlsInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [adding, setAdding] = useState(false);

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlsInput.trim()) return;

    setAdding(true);
    const urls = urlsInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    try {
      const res = await fetch('http://localhost:3001/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, format: selectedFormat })
      });

      if (!res.ok) {
        throw new Error('Failed to bulk queue URLs');
      }

      // Clear input on success
      setUrlsInput('');
    } catch (e) {
      console.error(e);
      // Fallback local queuing if network request error
      for (const url of urls) {
        await addToQueue(url, selectedFormat, 'youtube');
      }
      setUrlsInput('');
    } finally {
      setAdding(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <YoutubeIcon className="h-4 w-4 text-red-500" />;
      case 'instagram':
        return <InstagramIcon className="h-4 w-4 text-pink-500" />;
      default:
        return <Globe className="h-4 w-4 text-primary" />;
    }
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Multiple URLs Downloader</h2>
        <p className="text-sm text-muted-foreground">Paste multiple URLs line by line to download them simultaneously in the background.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Input Field */}
        <div className="col-span-1">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <form onSubmit={handleBulkAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="urls-textarea" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paste URLs (one per line)</label>
                <textarea
                  id="urls-textarea"
                  rows={8}
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=1&#10;https://youtube.com/watch?v=2&#10;https://instagram.com/reel/3"
                  className="w-full rounded-md border border-border bg-background p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
                  disabled={adding}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bulk-format" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Format for All</label>
                <select
                  id="bulk-format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="best">Best Quality Video</option>
                  <option value="mp3">Audio Only (MP3)</option>
                </select>
              </div>

              {isInternetDisconnected && (
                <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                  <AlertCircle className="h-4 w-4" />
                  <span>Downloads are disabled.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={adding || !urlsInput.trim() || !!isInternetDisconnected}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors"
              >
                {adding ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Adding items...
                  </>
                ) : (
                  <>
                    <ListPlus className="h-4 w-4" />
                    Add URLs to Queue
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Queue Listing */}
        <div className="col-span-1 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden h-full flex flex-col">
            <div className="border-b border-border bg-muted/40 px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Download Queue Status ({queue.length} items)</h3>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Queue
                </button>
              )}
            </div>

            <div className="p-5 flex-1 overflow-y-auto max-h-[480px] space-y-3">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm space-y-1.5 h-full">
                  <ListPlus className="h-8 w-8 opacity-25" />
                  <p>Queue is currently empty.</p>
                  <p className="text-[10px]">Paste links on the left to start downloading.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/80 bg-secondary/10 p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      {/* Platform Icon & Title */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="shrink-0">{getPlatformIcon(item.platform)}</div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground truncate">{item.title}</h4>
                          <p className="text-[9px] text-muted-foreground truncate">{item.url}</p>
                        </div>
                      </div>

                      {/* Controls and States */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                          item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.status === 'Failed' ? 'bg-red-500/10 text-red-500' :
                          item.status === 'Cancelled' ? 'bg-zinc-500/10 text-zinc-500' :
                          item.status === 'Downloading' ? 'bg-indigo-500/10 text-indigo-500' :
                          'bg-amber-500/10 text-amber-500 animate-pulse'
                        }`}>
                          {item.status}
                        </span>

                        <div className="flex items-center gap-1 border-l border-border pl-2">
                          {(item.status === 'Failed' || item.status === 'Cancelled' || item.status === 'Skipped') && (
                            <button
                              onClick={() => retryDownload(item.id)}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                              title="Retry Download"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {(item.status === 'Downloading' || item.status === 'Analyzing' || item.status === 'Queued' || item.status === 'Waiting') && (
                            <button
                              onClick={() => cancelDownload(item.id)}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                              title="Cancel Download"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => deleteQueueItem(item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress details */}
                    {item.status === 'Downloading' && (
                      <div className="space-y-1.5">
                        <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${item.progress}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>{item.progress.toFixed(1)}% ({item.downloadedMb} / {item.totalMb})</span>
                          <span>Speed: {item.speed} | ETA: {item.eta}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
