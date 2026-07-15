'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Download, ExternalLink, RefreshCw, AlertCircle, Music, Image as ImageIcon } from 'lucide-react';
import { InstagramIcon } from './icons';

interface MediaMetadata {
  title: string;
  uploader: string;
  thumbnail: string;
  webpage_url: string;
}

function InstagramImagesAnalyzingSkeleton() {
  return (
    <div className="rounded-xl border border-pink-500/10 bg-card shadow-xs overflow-hidden divide-y divide-border animate-pulse">
      <div className="p-5 flex flex-col sm:flex-row gap-5">
        <div className="relative aspect-square sm:w-40 bg-secondary/60 rounded-lg shrink-0 overflow-hidden border border-border">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-sweep 1.6s ease-in-out infinite',
            }}
          />
        </div>
        <div className="flex-1 space-y-4 min-w-0 py-1">
          <div className="space-y-2">
            <div className="h-4 bg-secondary/70 rounded w-4/5" />
            <div className="h-4 bg-secondary/50 rounded w-2/3" />
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="h-9 bg-primary/20 rounded w-48" />
      </div>
      <style>{`
        @keyframes skeleton-sweep {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function InstagramImagesDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  
  // Audio embedding checkboxes
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);

  const isAudioFormat = ['mp3_320', 'mp3_128', 'm4a', 'wav'].includes(selectedFormat);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setMetadata(null);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to extract Instagram link details. Make sure it is public.');
      }

      const data = await res.json();
      setMetadata(data.metadata);
    } catch (e: any) {
      setError(e?.message || 'Failed to extract Instagram details.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!metadata) return;
    await addToQueue(metadata.webpage_url, selectedFormat, 'instagram', embedMetadata, embedThumbnail);
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Instagram Images Downloader</h2>
        <p className="text-sm text-muted-foreground">Download carousel posts, pictures, or stories from public Instagram profiles.</p>
      </div>

      <div className="rounded-xl border border-pink-500/10 bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Instagram image or carousel link here..."
              className="w-full rounded-md border border-border bg-background pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              disabled={analyzing}
            />
            <InstagramIcon className="absolute right-3 top-3.5 h-4 w-4 text-pink-500" />
          </div>
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="flex items-center justify-center rounded-md bg-gradient-to-r from-pink-500 to-violet-600 text-white px-4 text-sm font-semibold hover:opacity-95 disabled:opacity-40 shadow-xs transition-opacity shrink-0"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {isInternetDisconnected && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Internet check failed. Downloads are disabled.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {analyzing && <InstagramImagesAnalyzingSkeleton />}

      {metadata && (
        <div className="rounded-xl border border-pink-500/15 bg-card shadow-xs overflow-hidden divide-y divide-border">
          <div className="p-5 flex flex-col sm:flex-row gap-5">
            <div className="relative aspect-square sm:w-40 bg-secondary rounded-lg overflow-hidden shrink-0 border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={metadata.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'}
                alt="thumbnail"
                className="object-cover w-full h-full"
              />
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-3">{metadata.title || 'Instagram Carousel / Image Post'}</h3>
                <p className="text-xs text-pink-500 font-semibold">Account: @{metadata.uploader || 'Instagram User'}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="img-format-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Format</label>
              <select
                id="img-format-select"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <optgroup label="Images">
                  <option value="best">Default Images Download (best)</option>
                </optgroup>
                <optgroup label="Audio (Extraction)">
                  <option value="mp3_320">MP3 320kbps (Best)</option>
                  <option value="mp3_128">MP3 128kbps (Standard)</option>
                  <option value="m4a">M4A (AAC Audio)</option>
                  <option value="wav">WAV (Lossless Audio)</option>
                </optgroup>
              </select>
            </div>

            {isAudioFormat && (
              <div className="flex flex-wrap items-center gap-4 px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-xs">
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

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleDownload}
                disabled={!!isInternetDisconnected}
                className="flex items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-violet-600 text-white px-4 py-2 text-sm font-semibold hover:opacity-95 shadow-xs disabled:opacity-40 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Add to Download Queue
              </button>

              <a
                href={metadata.webpage_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Open Instagram page"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
