'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import DuplicateDialog from './duplicate-dialog';
import { Download, ExternalLink, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { InstagramIcon } from './icons';

interface FormatItem {
  formatId: string;
  ext: string;
  resolution: string;
  note: string;
  filesize: number | null;
}

interface MediaMetadata {
  title: string;
  uploader: string;
  duration: number;
  views: number;
  uploadDate: string;
  thumbnail: string;
  webpage_url: string;
  formats: FormatItem[];
  subtitles: string[];
}

export default function InstagramDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('best');
  const [error, setError] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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
        throw new Error(errorData.error || 'Failed to analyze Instagram link. Make sure link is public.');
      }

      const data = await res.json();
      setMetadata(data.metadata);
      setSelectedFormat('best');
    } catch (e: any) {
      setError(e?.message || 'Failed to extract Instagram media. yt-dlp requires public profiles for Instagram scraping.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyTitle = () => {
    if (!metadata) return;
    navigator.clipboard.writeText(metadata.title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const checkAndDownload = async () => {
    if (!metadata) return;

    try {
      const res = await fetch('http://localhost:3001/duplicate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: metadata.title, url: metadata.webpage_url })
      });
      const data = await res.json();

      if (data.duplicate) {
        setDuplicateInfo(data.record);
        setShowDuplicateDialog(true);
      } else {
        triggerDownload();
      }
    } catch (e) {
      console.error(e);
      triggerDownload();
    }
  };

  const triggerDownload = async (duplicateAction?: string, customRename?: string) => {
    if (!metadata) return;

    await addToQueue(metadata.webpage_url, selectedFormat, 'instagram');
    
    setUrl('');
    setMetadata(null);
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
  };

  const handleDuplicateResolve = (action: 'skip' | 'download_anyway' | 'rename' | 'overwrite', renameVal?: string) => {
    if (action === 'skip') {
      setShowDuplicateDialog(false);
      setDuplicateInfo(null);
      return;
    }
    triggerDownload(action, renameVal);
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Instagram Downloader</h2>
        <p className="text-sm text-muted-foreground">Download Instagram Reels, carousel posts, videos, or stories from public accounts.</p>
      </div>

      {/* URL Input Form */}
      <div className="rounded-xl border border-pink-500/10 bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Instagram Reel or Post link here..."
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
              'Analyze Link'
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
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Instagram Media Preview Card */}
      {metadata && (
        <div className="rounded-xl border border-pink-500/15 bg-card shadow-xs overflow-hidden divide-y divide-border">
          {/* Main info row */}
          <div className="p-5 flex flex-col sm:flex-row gap-5">
            {/* Thumbnail */}
            <div className="relative aspect-square sm:w-40 bg-secondary rounded-lg overflow-hidden shrink-0 shadow-xs border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={metadata.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'}
                alt="thumbnail"
                className="object-cover w-full h-full"
              />
              {metadata.duration > 0 && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                  {formatDuration(metadata.duration)}
                </span>
              )}
            </div>

            {/* Title / Info */}
            <div className="flex-1 space-y-3.5 min-w-0">
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-3">{metadata.title || 'Instagram Post'}</h3>
                <p className="text-xs text-pink-500 font-semibold">Account: @{metadata.uploader || 'Instagram User'}</p>
              </div>

              <div className="text-xs text-muted-foreground flex gap-3">
                <span className="bg-secondary/60 rounded px-2.5 py-1">
                  Type: <strong className="text-foreground">Reel/Post</strong>
                </span>
                {metadata.duration > 0 && (
                  <span className="bg-secondary/60 rounded px-2.5 py-1">
                    Duration: <strong className="text-foreground">{formatDuration(metadata.duration)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Download options */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="ig-format" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Format</label>
              <select
                id="ig-format"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="best">Best Quality Media (Merged MP4)</option>
                <option value="mp3">Extract Audio Only (MP3)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={checkAndDownload}
                disabled={!!isInternetDisconnected}
                className="flex items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-violet-600 text-white px-4 py-2 text-sm font-semibold hover:opacity-95 shadow-xs disabled:opacity-40 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Add to Download Queue
              </button>

              <button
                onClick={handleCopyTitle}
                className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Copy caption text"
              >
                {copiedTitle ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
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

      {/* Duplicate Dialog */}
      <DuplicateDialog
        isOpen={showDuplicateDialog}
        title={metadata?.title || ''}
        duplicateInfo={duplicateInfo}
        onResolve={handleDuplicateResolve}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicateInfo(null);
        }}
      />
    </div>
  );
}
