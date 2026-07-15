'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import DuplicateDialog from './duplicate-dialog';
import { Download, Globe, Copy, Check, ExternalLink, HelpCircle, AlertCircle, RefreshCw, Music, Image as ImageIcon } from 'lucide-react';
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

function AnalyzingSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden divide-y divide-border animate-pulse">
      <div className="p-5 flex flex-col sm:flex-row gap-5">
        <div className="relative aspect-video sm:w-48 bg-secondary/60 rounded-lg shrink-0 overflow-hidden border border-border">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-sweep 1.6s ease-in-out infinite',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
              <div className="h-5 w-5 rounded bg-white/10" />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 min-w-0 py-1">
          <div className="space-y-2">
            <div className="h-4 bg-secondary/70 rounded w-4/5" />
            <div className="h-4 bg-secondary/50 rounded w-2/3" />
            <div className="h-3 bg-secondary/40 rounded w-1/3 mt-3" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-secondary/40 rounded p-1.5 space-y-1.5">
                <div className="h-4 bg-secondary/60 rounded mx-auto w-3/4" />
                <div className="h-2.5 bg-secondary/40 rounded mx-auto w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-3 bg-secondary/50 rounded w-28" />
          <div className="h-9 bg-secondary/40 rounded w-full" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <div className="h-9 bg-primary/20 rounded w-48" />
          <div className="h-9 w-9 bg-secondary/40 rounded" />
          <div className="h-9 w-9 bg-secondary/40 rounded" />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Fetching media information…</span>
        </div>
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

export default function YTShortsDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Audio embedding / metadata options
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);

  const isAudioFormat = () => {
    if (!metadata || !selectedFormat) return false;
    const fmt = metadata.formats.find(f => f.formatId === selectedFormat);
    if (!fmt) return false;
    return ['mp3', 'm4a', 'wav', 'aac', 'flac'].includes(fmt.ext.toLowerCase()) || 
           (fmt.note && fmt.note.toLowerCase().includes('audio only'));
  };

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
      
      if (data.metadata.formats && data.metadata.formats.length > 0) {
        setSelectedFormat(data.metadata.formats[0].formatId);
      } else {
        setSelectedFormat('best');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to extract YouTube Shorts information.');
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

    setDownloading(true);
    try {
      await addToQueue(metadata.webpage_url, selectedFormat, 'youtube', embedMetadata, embedThumbnail);
    } finally {
      setDownloading(false);
      setShowDuplicateDialog(false);
      setDuplicateInfo(null);
    }
  };

  const handleDuplicateResolve = (action: 'skip' | 'download_anyway' | 'rename' | 'overwrite', renameVal?: string) => {
    if (action === 'skip') {
      setShowDuplicateDialog(false);
      setDuplicateInfo(null);
      return;
    }
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
      <div>
        <h2 className="text-xl font-bold tracking-tight">YouTube Shorts Downloader</h2>
        <p className="text-sm text-muted-foreground">Scrape available format tracks dynamically and download YouTube Shorts or videos.</p>
      </div>

      {/* URL Input Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube Shorts or Video URL here..."
              className="w-full rounded-md border border-border bg-background pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              disabled={analyzing}
            />
            <YoutubeIcon className="absolute right-3 top-3 h-4 w-4 text-red-500" />
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

      {/* Skeleton loader while analyzing */}
      {analyzing && <AnalyzingSkeleton />}

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
                  <div>Default Ext</div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Chooser Form */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="format-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Dynamically Queried Format</label>
              <select
                id="format-select"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {metadata.formats && metadata.formats.length > 0 ? (
                  metadata.formats.map((fmt) => (
                    <option key={fmt.formatId} value={fmt.formatId}>
                      {fmt.resolution} ({fmt.ext}) - {fmt.note || 'No note'} {formatFilesize(fmt.filesize)}
                    </option>
                  ))
                ) : (
                  <option value="best">Best Quality (Default)</option>
                )}
              </select>
            </div>

            {/* Audio embedding options — shown only for audio formats */}
            {isAudioFormat() && (
              <div className="flex flex-wrap items-center gap-4 px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] shrink-0">Embed into file:</span>

                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={embedMetadata}
                      onChange={(e) => setEmbedMetadata(e.target.checked)}
                      className="peer h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                  <Music className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                    Metadata
                    <span className="text-muted-foreground ml-1">(title, artist, album…)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={embedThumbnail}
                      onChange={(e) => setEmbedThumbnail(e.target.checked)}
                      className="peer h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                    Thumbnail
                    <span className="text-muted-foreground ml-1">(cover art as JPG)</span>
                  </span>
                </label>
              </div>
            )}

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
                disabled={!!isInternetDisconnected || downloading}
                className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/95 shadow-xs disabled:opacity-40 transition-colors"
              >
                {downloading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
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
