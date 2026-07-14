'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import DuplicateDialog from './duplicate-dialog';
import { Download, Globe, Copy, Check, ExternalLink, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { YoutubeIcon } from './icons';

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

export default function SingleDownloaderView() {
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
        throw new Error(errorData.error || 'Failed to analyze URL');
      }

      const data = await res.json();
      setMetadata(data.metadata);
      setSelectedFormat('best'); // Reset default to best quality
    } catch (e: any) {
      setError(e?.message || 'Failed to extract media information.');
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
      // Check for duplicates
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
        // No duplicate, start download immediately
        triggerDownload();
      }
    } catch (e) {
      console.error(e);
      // Fallback: trigger download anyway if check fails
      triggerDownload();
    }
  };

  const triggerDownload = async (duplicateAction?: string, customRename?: string) => {
    if (!metadata) return;

    let targetFormat = selectedFormat;
    let targetTitle = metadata.title;

    // Send command
    await addToQueue(metadata.webpage_url, targetFormat, 'youtube');
    
    // Reset view form
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
    
    // Otherwise proceed with download
    triggerDownload(action, renameVal);
  };

  const formatViews = (num: number) => {
    if (!num) return 'N/A';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  const formatDuration = (secs: number) => {
    if (!secs) return 'N/A';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatFilesize = (bytes: number | null) => {
    if (!bytes) return '';
    return `(${(bytes / (1024 * 1024)).toFixed(1)} MB)`;
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Single Video Downloader</h2>
        <p className="text-sm text-muted-foreground">Scrape formats and download single videos from YouTube, Twitter/X, and more.</p>
      </div>

      {/* URL Input Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste video URL here (e.g. youtube.com/watch?v=...)"
              className="w-full rounded-md border border-border bg-background pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              disabled={analyzing}
            />
            {url.includes('youtube.com') && (
              <YoutubeIcon className="absolute right-3 top-3 h-4 w-4 text-red-500" />
            )}
          </div>
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors shrink-0"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {isInternetDisconnected && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>Internet connectivity check failed. Downloads are disabled until connection is restored.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Metadata Detail Preview Card */}
      {metadata && (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden divide-y divide-border">
          {/* Main info row */}
          <div className="p-5 flex flex-col sm:flex-row gap-5">
            {/* Thumbnail */}
            <div className="relative aspect-video sm:w-48 bg-secondary rounded-lg overflow-hidden shrink-0 shadow-xs border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={metadata.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300'}
                alt="thumbnail"
                className="object-cover w-full h-full"
              />
              <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                {formatDuration(metadata.duration)}
              </span>
            </div>

            {/* Title / Info */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">{metadata.title}</h3>
                <p className="text-xs text-muted-foreground">Uploader: <strong className="text-foreground">{metadata.uploader}</strong></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="bg-secondary/40 rounded p-1.5 text-center">
                  <div className="font-semibold text-foreground text-sm">{formatViews(metadata.views)}</div>
                  <div>Views</div>
                </div>
                <div className="bg-secondary/40 rounded p-1.5 text-center">
                  <div className="font-semibold text-foreground text-sm">
                    {metadata.uploadDate 
                      ? `${metadata.uploadDate.substring(0,4)}-${metadata.uploadDate.substring(4,6)}-${metadata.uploadDate.substring(6,8)}` 
                      : 'Unknown'}
                  </div>
                  <div>Upload Date</div>
                </div>
                <div className="bg-secondary/40 rounded p-1.5 text-center col-span-2 sm:col-span-1">
                  <div className="font-semibold text-foreground text-sm capitalize">{metadata.formats[0]?.ext || 'mp4'}</div>
                  <div>Format</div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Chooser Form */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="format-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Output Quality</label>
              <select
                id="format-select"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="best">Best Quality Video (Merge Video+Audio)</option>
                <option value="mp3">Audio Only (Extract to High Quality MP3)</option>
                <optgroup label="Direct Video Formats">
                  {metadata.formats
                    .filter(f => f.resolution && f.resolution.includes('x'))
                    .map(f => (
                      <option key={f.formatId} value={f.formatId}>
                        {f.resolution} ({f.ext}) - {f.note} {formatFilesize(f.filesize)}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Subtitles list */}
            {metadata.subtitles && metadata.subtitles.length > 0 && (
              <div className="text-xs text-muted-foreground flex gap-1.5 flex-wrap items-center">
                <span className="font-medium">Subtitles available:</span>
                {metadata.subtitles.slice(0, 8).map((sub) => (
                  <span key={sub} className="bg-secondary px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">{sub}</span>
                ))}
                {metadata.subtitles.length > 8 && (
                  <span>+{metadata.subtitles.length - 8} more</span>
                )}
              </div>
            )}

            {/* Form actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={checkAndDownload}
                disabled={!!isInternetDisconnected}
                className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/95 shadow-xs disabled:opacity-40 transition-colors"
              >
                <Download className="h-4 w-4" />
                Add to Download Queue
              </button>

              <button
                onClick={handleCopyTitle}
                className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Copy Title"
              >
                {copiedTitle ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>

              <a
                href={metadata.webpage_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Open original page"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Dialog popup */}
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
