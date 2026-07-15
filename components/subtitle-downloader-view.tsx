'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import {
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  Globe,
  CheckSquare,
  Square,
  Check,
  ChevronDown,
} from 'lucide-react';
import { YoutubeIcon } from './icons';

interface SubtitleLang {
  code: string;
  label: string;
  isAuto: boolean;
}

interface MediaMetadata {
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  webpage_url: string;
  subtitles: string[];          // manual subtitle language codes
  automaticCaptions?: string[]; // auto-generated language codes
}

// Map ISO 639-1/639-2 codes → human-readable names for common languages
const LANG_NAMES: Record<string, string> = {
  en: 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  'pt-BR': 'Portuguese (Brazil)', ru: 'Russian', ja: 'Japanese', ko: 'Korean',
  zh: 'Chinese', 'zh-Hans': 'Chinese (Simplified)', 'zh-Hant': 'Chinese (Traditional)',
  ar: 'Arabic', tr: 'Turkish', nl: 'Dutch', pl: 'Polish', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech', hu: 'Hungarian',
  ro: 'Romanian', uk: 'Ukrainian', id: 'Indonesian', ms: 'Malay', th: 'Thai',
  vi: 'Vietnamese', he: 'Hebrew', fa: 'Persian', ur: 'Urdu',
};

function langLabel(code: string): string {
  // Strip "en-orig" or other suffixes from auto-caption codes
  const base = code.replace(/-orig$/, '');
  return LANG_NAMES[base] || LANG_NAMES[code] || code.toUpperCase();
}

function SubtitleSkeleton() {
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
        </div>
        <div className="flex-1 space-y-4 min-w-0 py-1">
          <div className="space-y-2">
            <div className="h-4 bg-secondary/70 rounded w-4/5" />
            <div className="h-3 bg-secondary/50 rounded w-1/3" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-7 bg-secondary/40 rounded-full" style={{ width: `${48 + (i % 4) * 16}px` }} />
            ))}
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

function LangChip({
  lang,
  selected,
  onToggle,
}: {
  lang: SubtitleLang;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={lang.code}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-100 select-none ${
        selected
          ? 'bg-primary/15 border-primary/50 text-primary shadow-[0_0_0_1px] shadow-primary/20'
          : 'bg-secondary/40 border-border text-muted-foreground hover:border-border/80 hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      {selected ? (
        <Check className="h-3 w-3 shrink-0" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-60" />
      )}
      <span>{lang.label}</span>
      {lang.isAuto && (
        <span className={`text-[9px] font-semibold uppercase tracking-wide px-1 rounded ${selected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          auto
        </span>
      )}
    </button>
  );
}

export default function SubtitleDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [allLangs, setAllLangs] = useState<SubtitleLang[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showAllAuto, setShowAllAuto] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setMetadata(null);
    setAllLangs([]);
    setSelectedCodes(new Set());
    setError(null);
    setShowAllAuto(false);
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
      const meta = data.metadata as MediaMetadata;
      setMetadata(meta);

      // Build combined lang list — manual subtitles first, then auto-generated
      const langs: SubtitleLang[] = [];
      const seen = new Set<string>();

      for (const code of (meta.subtitles || [])) {
        if (!seen.has(code)) {
          seen.add(code);
          langs.push({ code, label: langLabel(code), isAuto: false });
        }
      }
      for (const code of (meta.automaticCaptions || [])) {
        if (!seen.has(code)) {
          seen.add(code);
          langs.push({ code, label: langLabel(code), isAuto: true });
        }
      }

      setAllLangs(langs);

      // Pre-select manual subtitles by default (if any), otherwise pre-select first auto
      const manualCodes = langs.filter(l => !l.isAuto).map(l => l.code);
      if (manualCodes.length > 0) {
        setSelectedCodes(new Set(manualCodes));
      } else if (langs.length > 0) {
        // pre-select 'en' auto if available, otherwise first
        const enAuto = langs.find(l => l.code === 'en' || l.code === 'en-US');
        setSelectedCodes(new Set([enAuto ? enAuto.code : langs[0].code]));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to extract subtitle information.');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleLang = (code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAll = () => setSelectedCodes(new Set(allLangs.map(l => l.code)));
  const deselectAll = () => setSelectedCodes(new Set());
  const selectManualOnly = () =>
    setSelectedCodes(new Set(allLangs.filter(l => !l.isAuto).map(l => l.code)));

  const handleDownload = async () => {
    if (!metadata) return;
    setDownloading(true);
    const subLangs = selectedCodes.size > 0 ? [...selectedCodes] : undefined;
    await addToQueue(metadata.webpage_url, 'subtitle', 'youtube', undefined, undefined, subLangs);
    setDownloading(false);
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  // Partition langs for display
  const manualLangs = allLangs.filter(l => !l.isAuto);
  const autoLangs = allLangs.filter(l => l.isAuto);
  // Limit visible auto langs unless expanded
  const visibleAutoLangs = showAllAuto ? autoLangs : autoLangs.slice(0, 12);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">YouTube Subtitle Downloader</h2>
        <p className="text-sm text-muted-foreground">
          Fetch available subtitle tracks and choose exactly which languages to download.
        </p>
      </div>

      {/* URL Input */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube video URL here..."
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
                Fetching...
              </>
            ) : (
              'Fetch Subtitles'
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

      {analyzing && <SubtitleSkeleton />}

      {metadata && (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden divide-y divide-border">

          {/* Video Info */}
          <div className="p-5 flex flex-col sm:flex-row gap-5">
            <div className="relative aspect-video sm:w-48 bg-secondary rounded-lg overflow-hidden shrink-0 border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={metadata.thumbnail || ''}
                alt="thumbnail"
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">
                {metadata.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Uploader: <strong className="text-foreground">{metadata.uploader}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {allLangs.length === 0
                  ? '⚠ No subtitle tracks found for this video.'
                  : `${allLangs.length} subtitle track${allLangs.length !== 1 ? 's' : ''} found — ${manualLangs.length} manual, ${autoLangs.length} auto-generated`
                }
              </p>
            </div>
          </div>

          {allLangs.length > 0 && (
            <>
              {/* Language Picker */}
              <div className="p-5 space-y-4">
                {/* Bulk controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                    Select Languages:
                  </span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors border border-border"
                  >
                    <CheckSquare className="h-3 w-3" /> All
                  </button>
                  {manualLangs.length > 0 && (
                    <button
                      type="button"
                      onClick={selectManualOnly}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors border border-border"
                    >
                      <FileText className="h-3 w-3" /> Manual only
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors border border-border"
                  >
                    <Square className="h-3 w-3" /> None
                  </button>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedCodes.size} selected
                  </span>
                </div>

                {/* Manual subtitles section */}
                {manualLangs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-emerald-500">
                      Manual / Uploaded Subtitles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {manualLangs.map(lang => (
                        <LangChip
                          key={lang.code}
                          lang={lang}
                          selected={selectedCodes.has(lang.code)}
                          onToggle={() => toggleLang(lang.code)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-generated subtitles section */}
                {autoLangs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-500">
                      Auto-generated Captions ({autoLangs.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleAutoLangs.map(lang => (
                        <LangChip
                          key={lang.code}
                          lang={lang}
                          selected={selectedCodes.has(lang.code)}
                          onToggle={() => toggleLang(lang.code)}
                        />
                      ))}
                    </div>
                    {autoLangs.length > 12 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAuto(v => !v)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllAuto ? 'rotate-180' : ''}`} />
                        {showAllAuto ? 'Show less' : `Show ${autoLangs.length - 12} more`}
                      </button>
                    )}
                  </div>
                )}

                {/* Selection summary */}
                {selectedCodes.size > 0 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary">
                    Will download: <strong>{[...selectedCodes].join(', ')}</strong>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="p-5 flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!!isInternetDisconnected || selectedCodes.size === 0 || downloading}
                  className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/95 shadow-xs disabled:opacity-40 transition-colors"
                >
                  {downloading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {selectedCodes.size === 0
                    ? 'Select languages first'
                    : `Download ${selectedCodes.size} track${selectedCodes.size !== 1 ? 's' : ''}`
                  }
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
            </>
          )}

          {/* No subtitles state */}
          {allLangs.length === 0 && (
            <div className="p-5 flex items-center gap-3 text-sm text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No subtitle tracks were found for this video. Try a different video or check if subtitles are available.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
