'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Settings, Save, RotateCcw, ShieldCheck, Check, Info } from 'lucide-react';

export default function SettingsView() {
  const { settings, updateSettings, fetchSettings } = useAppStore();
  
  // Local form state
  const [downloadFolder, setDownloadFolder] = useState('');
  const [defaultVideoQuality, setDefaultVideoQuality] = useState('');
  const [defaultAudioQuality, setDefaultAudioQuality] = useState('');
  const [themePreference, setThemePreference] = useState('dark');
  const [concurrentDownloads, setConcurrentDownloads] = useState(3);
  const [maxQueueSize, setMaxQueueSize] = useState(50);
  const [autoRetry, setAutoRetry] = useState(true);
  const [retryCount, setRetryCount] = useState(3);
  const [duplicateHandling, setDuplicateHandling] = useState<'ask' | 'skip' | 'overwrite' | 'rename'>('ask');
  const [defaultOutputTemplate, setDefaultOutputTemplate] = useState('');
  const [subtitlePreferences, setSubtitlePreferences] = useState('');
  const [ffmpegPath, setFfmpegPath] = useState('ffmpeg');
  const [ytdlpPath, setYtdlpPath] = useState('yt-dlp');
  
  const [saved, setSaved] = useState(false);

  // Sync settings when loaded from store
  useEffect(() => {
    if (settings) {
      setDownloadFolder(settings.downloadFolder);
      setDefaultVideoQuality(settings.defaultVideoQuality);
      setDefaultAudioQuality(settings.defaultAudioQuality);
      setThemePreference(settings.theme || 'dark');
      setConcurrentDownloads(settings.concurrentDownloads);
      setMaxQueueSize(settings.maxQueueSize);
      setAutoRetry(settings.autoRetry);
      setRetryCount(settings.retryCount);
      setDuplicateHandling(settings.duplicateHandling);
      setDefaultOutputTemplate(settings.defaultOutputTemplate);
      setSubtitlePreferences(settings.subtitlePreferences || '');
      setFfmpegPath(settings.ffmpegPath || 'ffmpeg');
      setYtdlpPath(settings.ytdlpPath || 'yt-dlp');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      downloadFolder,
      defaultVideoQuality,
      defaultAudioQuality,
      theme: themePreference,
      concurrentDownloads: Number(concurrentDownloads),
      maxQueueSize: Number(maxQueueSize),
      autoRetry,
      retryCount: Number(retryCount),
      duplicateHandling,
      defaultOutputTemplate,
      subtitlePreferences,
      ffmpegPath,
      ytdlpPath
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetDefaults = async () => {
    if (!confirm('Are you sure you want to reset settings to default values?')) return;
    
    // Clear custom settings on backend by posting default dictionary
    await updateSettings({
      downloadFolder: "d:\\my workspace\\Personal_Tools\\Gan_Downloader\\downloads",
      defaultVideoQuality: "bestvideo+bestaudio/best",
      defaultAudioQuality: "bestaudio/best",
      theme: "dark",
      concurrentDownloads: 3,
      maxQueueSize: 50,
      autoRetry: true,
      retryCount: 3,
      duplicateHandling: "ask",
      defaultOutputTemplate: "%(title)s.%(ext)s",
      subtitlePreferences: "en",
      ffmpegPath: "ffmpeg",
      ytdlpPath: "yt-dlp"
    });

    alert('Settings reset to defaults.');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Title */}
      <div className="border-b border-border pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
          <p className="text-sm text-muted-foreground">Adjust local path overrides, download quality defaults, and queue options.</p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary rounded text-xs font-semibold transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Storage Paths */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            Executable & Storage Paths
          </h3>

          <div className="grid grid-cols-1 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Local Download Folder Path</label>
              <input
                type="text"
                value={downloadFolder}
                onChange={(e) => setDownloadFolder(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <span className="text-[10px] text-muted-foreground">Folder path where completed videos will be saved.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">yt-dlp Path / Executable</label>
                <input
                  type="text"
                  value={ytdlpPath}
                  onChange={(e) => setYtdlpPath(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">FFmpeg Path / Executable</label>
                <input
                  type="text"
                  value={ffmpegPath}
                  onChange={(e) => setFfmpegPath(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Queue Concurrency and Options */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h3 className="font-semibold text-sm">Download Queue Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Concurrent Downloads Limit</label>
              <input
                type="number"
                min={1}
                max={10}
                value={concurrentDownloads}
                onChange={(e) => setConcurrentDownloads(Number(e.target.value))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
                required
              />
              <span className="text-[10px] text-muted-foreground">Maximum simultaneous downloads at one time.</span>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Max Queue Buffer Size</label>
              <input
                type="number"
                min={10}
                value={maxQueueSize}
                onChange={(e) => setMaxQueueSize(Number(e.target.value))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Duplicate File Handling Strategy</label>
              <select
                value={duplicateHandling}
                onChange={(e) => setDuplicateHandling(e.target.value as any)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
              >
                <option value="ask">Ask User (Trigger Duplicate Dialog Popup)</option>
                <option value="skip">Skip Download Automatically</option>
                <option value="overwrite">Overwrite Existing File</option>
                <option value="rename">Rename File (Appends Timestamp Suffix)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Default Output Template</label>
              <input
                type="text"
                value={defaultOutputTemplate}
                onChange={(e) => setDefaultOutputTemplate(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Card 3: Quality Preferences */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h3 className="font-semibold text-sm">Quality & Subtitle Formats</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Default Video Format Filter (`-f` parameter)</label>
              <input
                type="text"
                value={defaultVideoQuality}
                onChange={(e) => setDefaultVideoQuality(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Default Audio Format Extract</label>
              <input
                type="text"
                value={defaultAudioQuality}
                onChange={(e) => setDefaultAudioQuality(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Subtitle Languages Preference</label>
              <input
                type="text"
                value={subtitlePreferences}
                onChange={(e) => setSubtitlePreferences(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono"
                placeholder="e.g. en,es,fr (comma separated, leave blank to disable)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground">Interface UI Theme</label>
              <select
                value={themePreference}
                onChange={(e) => setThemePreference(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
              >
                <option value="dark">Sleek Dark Theme (Default)</option>
                <option value="light">Clean Light Theme</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button floating panel */}
        <div className="flex items-center justify-between border border-border bg-card p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Settings are saved to backend json block and applied globally.</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold hover:bg-primary/95 shadow-xs transition-colors"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                Settings Saved Successfully!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save System Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
