'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Search, Download, RefreshCw, AlertCircle, Music, ImageIcon, Play, Clock } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail: string;
}

function SearchLoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded-lg border border-border bg-card overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-sweep 1.6s ease-in-out infinite',
            }}
          />
          <div className="h-16 w-28 bg-secondary/60 rounded shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 bg-secondary/70 rounded w-5/6" />
            <div className="h-3 bg-secondary/50 rounded w-2/3" />
            <div className="h-2.5 bg-secondary/40 rounded w-24" />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes skeleton-sweep {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function YTSearchDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Track which item is selected for download config
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);

  const isAudioFormat = ['mp3_320', 'mp3_128', 'm4a', 'wav'].includes(selectedFormat);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setResults([]);
    setError(null);
    setActiveId(null);
    try {
      const res = await fetch('http://localhost:3001/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 20 })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Search query failed.');
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to search YouTube.');
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (item: SearchResult) => {
    await addToQueue(item.url, selectedFormat, 'youtube', embedMetadata, embedThumbnail);
    // Do NOT reset search results or query so user keeps context!
    // Simply clear the active configuration card view
    setActiveId(null);
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Direct YouTube Search & Download</h2>
        <p className="text-sm text-muted-foreground">Search and discover videos instantly on YouTube, then choose quality and download directly.</p>
      </div>

      {/* Search Bar Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube videos (e.g. lo-fi coding music)..."
              className="w-full rounded-md border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              disabled={searching}
            />
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors shrink-0"
          >
            {searching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </form>

        {isInternetDisconnected && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Downloads are disabled.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {searching && <SearchLoadingSkeleton />}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Search Results ({results.length})</h3>
          
          <div className="space-y-2">
            {results.map((item) => {
              const isOpen = activeId === item.id;
              return (
                <div 
                  key={item.id} 
                  className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                    isOpen ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-zinc-700'
                  }`}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => {
                      if (isOpen) {
                        setActiveId(null);
                      } else {
                        setActiveId(item.id);
                        setSelectedFormat('best');
                      }
                    }}
                    className="flex gap-4 p-3 cursor-pointer items-start select-none"
                  >
                    {/* Thumbnail with lazy load */}
                    <div className="relative h-16 w-28 shrink-0 rounded overflow-hidden bg-black flex items-center justify-center border border-border/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.thumbnail} 
                        alt="thumbnail" 
                        loading="lazy"
                        className="w-full h-full object-cover opacity-95" 
                      />
                      <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] font-medium text-zinc-200 px-1 rounded flex items-center gap-0.5 shadow-xs">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDuration(item.duration)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-sm font-semibold leading-snug text-foreground line-clamp-2" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">ID: {item.id}</p>
                    </div>
                  </div>

                  {/* Inline Options Card Drawer */}
                  {isOpen && (
                    <div className="border-t border-border bg-card/65 px-4 py-4 space-y-4">
                      <div className="space-y-2">
                        <label htmlFor={`format-${item.id}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Format</label>
                        <select
                          id={`format-${item.id}`}
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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

                      {isAudioFormat && (
                        <div className="flex flex-wrap items-center gap-4 px-3 py-2 rounded-lg border border-border bg-secondary/20 text-xs">
                          <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] shrink-0">Embed into file:</span>
                          <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <input
                              type="checkbox"
                              checked={embedMetadata}
                              onChange={(e) => setEmbedMetadata(e.target.checked)}
                              className="peer h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                            />
                            <Music className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-foreground/80 group-hover:text-foreground transition-colors">Metadata</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <input
                              type="checkbox"
                              checked={embedThumbnail}
                              onChange={(e) => setEmbedThumbnail(e.target.checked)}
                              className="peer h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                            />
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-foreground/80 group-hover:text-foreground transition-colors">Thumbnail</span>
                          </label>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveId(null)}
                          className="px-3.5 py-1.5 border border-border bg-card rounded-md text-xs font-semibold hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={!!isInternetDisconnected}
                          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/95 shadow-xs disabled:opacity-40 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Add to Queue
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
