'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Download, Upload, RefreshCw, AlertCircle, Music, ImageIcon, ListPlus } from 'lucide-react';

function SongListAddingSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-3 bg-secondary/60 rounded w-1/4" />
        <div className="h-6 bg-secondary/40 rounded w-full" />
        <div className="h-6 bg-secondary/40 rounded w-5/6" />
        <div className="h-6 bg-secondary/40 rounded w-2/3" />
      </div>
      <div className="h-9 bg-primary/20 rounded w-full mt-4" />
    </div>
  );
}

export default function SongListDownloaderView() {
  const { addToQueue, health, connected } = useAppStore();
  const [songList, setSongList] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('mp3_320');
  
  // Audio checkboxes
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAudioFormat = ['mp3_320', 'mp3_128', 'm4a', 'wav'].includes(selectedFormat);

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setSongList(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songList.trim()) return;

    setAdding(true);
    setError(null);

    const songs = songList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    try {
      for (const song of songs) {
        // Formulate search url ytsearch1:song_name
        const searchUrl = `ytsearch1:${song}`;
        await addToQueue(searchUrl, selectedFormat, 'youtube', embedMetadata, embedThumbnail);
      }
      // Do NOT reset song list, just let the user see it's queued.
    } catch (err: any) {
      setError(err?.message || 'Failed to queue all songs.');
    } finally {
      setAdding(false);
    }
  };

  const isInternetDisconnected = connected && health && !health.internetAvailable;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Song Names List Downloader</h2>
        <p className="text-sm text-muted-foreground">Type song names or upload a list of text. The system searches and queues downloads automatically.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        {adding ? (
          <SongListAddingSkeleton />
        ) : (
          <form onSubmit={handleDownloadAll} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="song-list-textarea" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Song Names (one per line)</label>
                <label className="text-[10px] bg-secondary hover:bg-secondary/80 text-foreground px-2.5 py-1 rounded cursor-pointer border border-border flex items-center gap-1 transition-colors select-none">
                  <Upload className="h-3 w-3" />
                  <span>Upload .txt</span>
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handleTxtUpload}
                  />
                </label>
              </div>
              <textarea
                id="song-list-textarea"
                rows={8}
                value={songList}
                onChange={(e) => setSongList(e.target.value)}
                placeholder="Billie Jean - Michael Jackson&#10;Fix You - Coldplay&#10;Lofi coding beats"
                className="w-full rounded-md border border-border bg-background p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
                disabled={adding}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="song-format" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Download Format</label>
                <select
                  id="song-format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <optgroup label="Audio">
                    <option value="mp3_320">MP3 320kbps (Best)</option>
                    <option value="mp3_128">MP3 128kbps (Standard)</option>
                    <option value="m4a">M4A (AAC Audio)</option>
                    <option value="wav">WAV (Lossless Audio)</option>
                  </optgroup>
                  <optgroup label="Video">
                    <option value="best">Best Quality Video</option>
                    <option value="mp4_1080p">MP4 1080p Video</option>
                  </optgroup>
                </select>
              </div>

              {isAudioFormat && (
                <div className="flex flex-col justify-center space-y-2.5 px-3 py-2.5 rounded-lg border border-border bg-secondary/20 text-xs">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Embed into file:</span>
                  <div className="flex gap-4">
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
                </div>
              )}
            </div>

            {isInternetDisconnected && (
              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                <AlertCircle className="h-4 w-4" />
                <span>Internet check failed. Downloads are disabled.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={adding || !songList.trim() || !!isInternetDisconnected}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/95 disabled:opacity-40 shadow-xs transition-colors"
            >
              {adding ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  Adding list to queue...
                </>
              ) : (
                <>
                  <ListPlus className="h-4 w-4 mr-1" />
                  Search & Download All Songs
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
