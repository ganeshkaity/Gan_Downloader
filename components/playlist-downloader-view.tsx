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
  AlertCircle,
  LayoutGrid,
  LayoutList
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
  const [globalAudio, setGlobalAudio] = useState('original');
  const [globalSubtitles, setGlobalSubtitles] = useState('none');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);
  
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
      setVisibleCount(100);
      setRangeStart('');
      setRangeEnd('');
    } catch (e: any) {
      setError(e?.message || 'Failed to extract playlist information.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle selection for an individual item
  const toggleItem = (id: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  // Set format override for individual item
  const setItemFormat = (id: string, format: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, format } : e));
  };

  // Apply range selection
  const applyRangeSelection = () => {
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) return;

    setEntries(entries.map((e, idx) => {
      const position = idx + 1; // 1-indexed
      if (position >= start && position <= end) {
        return { ...e, selected: true };
      }
      return e;
    }));
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    const allSelected = entries.every(e => e.selected);
    setEntries(entries.map(e => ({ ...e, selected: !allSelected })));
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

    // Retain playlist, but uncheck the downloaded items
    setEntries(entries.map(e => ({ ...e, selected: false })));
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

              {/* Global Format removed from here to the new toolbar */}

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
            {/* Configuration bar */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 border border-border bg-card p-3 rounded-lg shadow-xs text-xs text-muted-foreground">
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground hover:text-primary transition-colors shrink-0">
                  <input 
                    type="checkbox" 
                    checked={entries.length > 0 && entries.every(e => e.selected)}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary focus:ring-offset-zinc-950 h-3.5 w-3.5 cursor-pointer"
                  />
                  Select all
                </label>

                {/* Range Select */}
                <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
                  <span>Range:</span>
                  <input 
                    type="number"
                    placeholder="Min"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-12 bg-background border border-border text-foreground rounded px-1.5 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                    min={1}
                    max={entries.length}
                  />
                  <span>to</span>
                  <input 
                    type="number"
                    placeholder="Max"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-12 bg-background border border-border text-foreground rounded px-1.5 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                    min={1}
                    max={entries.length}
                  />
                  <button
                    type="button"
                    onClick={applyRangeSelection}
                    className="px-2 py-0.5 bg-primary/20 text-primary hover:bg-primary/30 rounded text-[10px] font-semibold transition-colors ml-1"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <label>Default format:</label>
                  <select 
                    value={globalFormat}
                    onChange={(e) => applyGlobalFormat(e.target.value)}
                    className="bg-background border border-border text-foreground rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <optgroup label="Video">
                      <option value="best">Best Quality (Default)</option>
                      <option value="mp4_2160p">MP4 4K (2160p)</option>
                      <option value="mp4_1440p">MP4 2K (1440p)</option>
                      <option value="mp4_1080p">MP4 1080p</option>
                      <option value="mp4_720p">MP4 720p</option>
                      <option value="mp4_480p">MP4 480p</option>
                    </optgroup>
                    <optgroup label="Audio">
                      <option value="mp3_320">MP3 320kbps (Best)</option>
                      <option value="mp3_128">MP3 128kbps (Standard)</option>
                      <option value="m4a">M4A (AAC Audio)</option>
                      <option value="wav">WAV (Lossless Audio)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label>Audio track:</label>
                  <select
                    value={globalAudio}
                    onChange={(e) => setGlobalAudio(e.target.value)}
                    className="bg-background border border-border text-foreground rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="original">Original Track (Default)</option>
                    <option value="english">English (Translated)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label>Subtitles:</label>
                  <select
                    value={globalSubtitles}
                    onChange={(e) => setGlobalSubtitles(e.target.value)}
                    className="bg-background border border-border text-foreground rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="none">No Subtitles</option>
                    <option value="en">English</option>
                    <option value="all">All Available</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center border border-border rounded overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'bg-background hover:bg-secondary'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'bg-background hover:bg-secondary'}`}
                  title="List View"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Virtualized/Scroll track cards container */}
            <div className={`max-h-[600px] overflow-y-auto pr-1 pb-4 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3' : 'space-y-2'}`}>
              {filteredEntries.slice(0, visibleCount).map((item, index) => (
                viewMode === 'grid' ? (
                  <div 
                    key={`${item.id}-${index}`} 
                    className={`relative flex items-center gap-3 rounded-lg border p-2 bg-card hover:border-primary/50 transition-colors ${
                      item.selected ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Checkbox overlay */}
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(item.id)}
                      className="absolute top-2 right-2 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary focus:ring-offset-zinc-950 cursor-pointer z-10 shadow-sm"
                    />
                    
                    <div className="relative h-16 w-24 shrink-0 rounded overflow-hidden bg-black flex items-center justify-center border border-border/50">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="thumb" className="w-full h-full object-cover opacity-90" />
                      ) : (
                        <ListMusic className="h-5 w-5 text-muted-foreground opacity-50" />
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-medium text-zinc-200 px-1 rounded shadow-xs">
                        {formatDuration(item.duration)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-5">
                      <h4 className="text-xs font-semibold leading-tight line-clamp-2" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {playlist?.uploader || 'Unknown Channel'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    key={`${item.id}-${index}`} 
                    className={`flex items-center gap-3 rounded-lg border p-3 bg-card hover:bg-secondary/10 transition-colors ${
                      item.selected ? 'border-primary/30 bg-primary/5' : 'border-border/30 opacity-60'
                    }`}
                  >
                    {/* Select Checkbox */}
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary focus:ring-offset-zinc-950 cursor-pointer shrink-0"
                    />
                    
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="thumb" className="h-10 w-16 object-cover rounded shadow-xs shrink-0" />
                    ) : (
                      <div className="h-10 w-16 bg-secondary rounded flex items-center justify-center shrink-0">
                        <ListMusic className="h-4 w-4 opacity-50" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate" title={item.title}>{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDuration(item.duration)}
                      </p>
                    </div>
                  </div>
                )
              ))}

              {visibleCount < filteredEntries.length && (
                <div className="flex justify-center pt-4 pb-2 col-span-full w-full">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 50)}
                    className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 rounded-lg border border-zinc-850 text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                    Load More Tracks ({filteredEntries.length - visibleCount} remaining)
                  </button>
                </div>
              )}

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
