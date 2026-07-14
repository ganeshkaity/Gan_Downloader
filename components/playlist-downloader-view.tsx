'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { 
  ListMusic, 
  Download, 
  Search, 
  Check, 
  Square, 
  CheckSquare, 
  ChevronDown, 
  HelpCircle, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';

interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail: string | null;
  selected?: boolean;
  format?: string;
}

interface PlaylistMetadata {
  title: string;
  uploader: string;
  videoCount: number;
  entries: PlaylistEntry[];
}

export default function PlaylistDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalFormat, setGlobalFormat] = useState('best');
  
  // Track specific overrides
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setPlaylist(null);
    setEntries([]);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze playlist');
      }

      const data = await res.json();
      setPlaylist(data.playlist);
      
      // Initialize entries with local state for select/format overrides
      const initializedEntries = data.playlist.entries.map((entry: any) => ({
        ...entry,
        selected: true,
        format: 'best'
      }));
      setEntries(initializedEntries);
    } catch (e: any) {
      setError(e?.message || 'Failed to extract playlist information.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle selection for an individual item
  const toggleItem = (idx: number) => {
    const updated = [...entries];
    updated[idx].selected = !updated[idx].selected;
    setEntries(updated);
  };

  // Set format override for individual item
  const setItemFormat = (idx: number, format: string) => {
    const updated = [...entries];
    updated[idx].format = format;
    setEntries(updated);
  };

  // Select all items
  const selectAll = () => {
    setEntries(entries.map(e => ({ ...e, selected: true })));
  };

  // Unselect all items
  const unselectAll = () => {
    setEntries(entries.map(e => ({ ...e, selected: false })));
  };

  // Apply format to all selected
  const applyGlobalFormat = (fmt: string) => {
    setGlobalFormat(fmt);
    setEntries(entries.map(e => ({ ...e, format: fmt })));
  };

  // Search filter
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(query));
  }, [entries, searchQuery]);

  // Selected count & duration
  const selectedEntries = useMemo(() => {
    return entries.filter(e => e.selected);
  }, [entries]);

  const totalDuration = useMemo(() => {
    const secs = selectedEntries.reduce((acc, e) => acc + (e.duration || 0), 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m ${s}s`;
  }, [selectedEntries]);

  // Trigger batch download
  const handleBatchDownload = async () => {
    if (selectedEntries.length === 0) return;

    for (const item of selectedEntries) {
      // Add each item in sequence to the download queue
      await addToQueue(item.url, item.format || 'best', 'youtube');
    }

    // Reset page view
    setUrl('');
    setPlaylist(null);
    setEntries([]);
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Playlist Downloader</h2>
        <p className="text-sm text-muted-foreground">Download entire video albums or playlist channels. Scrape tracks in batch.</p>
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube Playlist URL here..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            disabled={analyzing}
          />
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors shrink-0"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Playlist...
              </>
            ) : (
              'Analyze Playlist'
            )}
          </button>
        </form>

        {isInternetDisconnected && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Internet connectivity check failed. Downloads are disabled.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {playlist && entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Info & Controls */}
          <div className="col-span-1 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              {/* Cover Placeholder */}
              <div className="aspect-video w-full rounded-lg bg-secondary flex items-center justify-center border border-border shadow-xs">
                <ListMusic className="h-10 w-10 text-primary opacity-60" />
              </div>

              <div>
                <h3 className="font-bold text-base line-clamp-2">{playlist.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Creator: <strong className="text-foreground">{playlist.uploader}</strong></p>
              </div>

              <div className="border-t border-border/80 pt-3.5 space-y-2.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Selected Videos:</span>
                  <span className="font-semibold text-foreground">{selectedEntries.length} / {entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Duration:</span>
                  <span className="font-semibold text-foreground">{totalDuration}</span>
                </div>
              </div>

              {/* Set Global Format */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="global-format" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Apply Format to All</label>
                <select
                  id="global-format"
                  value={globalFormat}
                  onChange={(e) => applyGlobalFormat(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="best">Best Quality Video</option>
                  <option value="mp3">Audio Only (MP3)</option>
                </select>
              </div>

              {/* Batch Action Button */}
              <button
                onClick={handleBatchDownload}
                disabled={selectedEntries.length === 0 || !!isInternetDisconnected}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors"
              >
                <Download className="h-4 w-4" />
                Batch Download ({selectedEntries.length})
              </button>
            </div>
          </div>

          {/* Right panel: Filter and Track cards */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            {/* Filter actions bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 border border-border bg-card p-3 rounded-lg shadow-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tracks in playlist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded bg-secondary/35 border border-border pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1.5 border border-border bg-card hover:bg-secondary rounded text-xs font-semibold transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={unselectAll}
                  className="px-2.5 py-1.5 border border-border bg-card hover:bg-secondary rounded text-xs font-semibold transition-colors"
                >
                  Unselect All
                </button>
              </div>
            </div>

            {/* Virtualized/Scroll track cards container */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredEntries.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-center gap-3 rounded-lg border p-3 bg-card hover:bg-secondary/10 transition-colors ${
                    item.selected ? 'border-border' : 'border-border/30 opacity-60'
                  }`}
                >
                  {/* Select Checkbox */}
                  <button 
                    onClick={() => toggleItem(index)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {item.selected ? (
                      <CheckSquare className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <Square className="h-4.5 w-4.5" />
                    )}
                  </button>

                  {/* Micro Thumbnail */}
                  <div className="relative aspect-video w-20 rounded bg-secondary border border-border overflow-hidden shrink-0">
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <ListMusic className="h-4 w-4 m-auto text-muted-foreground" />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] text-white px-1 rounded font-mono">
                      {formatDuration(item.duration)}
                    </span>
                  </div>

                  {/* Title and details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-foreground truncate">{item.title}</h4>
                    <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{item.url}</p>
                  </div>

                  {/* Format dropdown */}
                  <div className="shrink-0">
                    <select
                      value={item.format || 'best'}
                      onChange={(e) => setItemFormat(index, e.target.value)}
                      className="bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                    >
                      <option value="best">Video</option>
                      <option value="mp3">Audio (MP3)</option>
                    </select>
                  </div>
                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">No matching tracks found.</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
