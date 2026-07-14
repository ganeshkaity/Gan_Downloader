'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { 
  DownloadRecord, 
  QueueItem 
} from '@/types';
import { 
  HardDrive, 
  Cpu, 
  History, 
  Folder, 
  Play, 
  Pause, 
  X, 
  RefreshCw, 
  FolderOpen, 
  Settings, 
  Activity, 
  Download, 
  CheckCircle,
  Copy,
  AlertTriangle,
  ListMusic,
  ListTodo
} from 'lucide-react';

export default function DashboardView() {
  const { 
    queue, 
    health, 
    connected, 
    settings, 
    setActiveView, 
    cancelDownload, 
    retryDownload 
  } = useAppStore();

  const [recentDownloads, setRecentDownloads] = useState<DownloadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch recent history items
  useEffect(() => {
    async function fetchRecentHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch('http://localhost:3001/history');
        if (res.ok) {
          const data = await res.json();
          setRecentDownloads(data.slice(0, 5)); // Keep only top 5 recent
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchRecentHistory();
  }, [queue]); // Re-fetch when queue changes (downloads complete)

  // Calculations for stats
  const activeDownloads = queue.filter(
    item => item.status === 'Downloading' || item.status === 'Analyzing'
  );
  
  const queuedDownloads = queue.filter(
    item => item.status === 'Queued' || item.status === 'Waiting'
  );

  const completedTodayCount = recentDownloads.filter(item => {
    const downloadedDate = new Date(item.downloadedAt).toDateString();
    const todayDate = new Date().toDateString();
    return downloadedDate === todayDate;
  }).length;

  const currentSpeed = activeDownloads.reduce((acc, item) => {
    // Parse speed e.g. "3.45MiB/s"
    const match = item.speed.match(/([\d\.]+)\s*(\w+)\/s/);
    if (!match) return acc;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let multiplier = 1;
    if (unit.startsWith('m')) multiplier = 1024 * 1024;
    else if (unit.startsWith('k')) multiplier = 1024;
    else if (unit.startsWith('g')) multiplier = 1024 * 1024 * 1024;
    
    return acc + (value * multiplier);
  }, 0);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return `${parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const diskUsagePercentage = health?.diskSpace.percentageUsed || 0;
  const diskFreeGb = ((health?.diskSpace.freeBytes || 0) / (1024 ** 3)).toFixed(1);
  const diskTotalGb = ((health?.diskSpace.totalBytes || 0) / (1024 ** 3)).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor system tasks, disk speeds, and your local media downloads folder.</p>
        </div>
        <div className="flex items-center gap-2 text-xs border border-border rounded-md px-3 py-1.5 bg-card shadow-xs">
          <Folder className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground font-semibold">Active Folder:</span>
          <span className="text-foreground max-w-[200px] truncate">{settings?.downloadFolder || 'Default'}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric Cards Row */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Backend Status */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Backend Status</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{connected ? '🟢 Connected' : '🔴 Offline'}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {connected ? `yt-dlp: v${health?.version || 'Latest'} | Latency: ${health?.latency}ms` : 'Unable to reach backend Express API'}
            </p>
          </div>

          {/* Card 2: Running Tasks */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Running Downloads</span>
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{activeDownloads.length}</span>
              {queuedDownloads.length > 0 && (
                <span className="text-sm text-muted-foreground">({queuedDownloads.length} queued)</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Current network speed: <strong className="text-foreground">{formatSpeed(currentSpeed)}</strong>
            </p>
          </div>

          {/* Card 3: Today's Downloads */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Downloads</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{completedTodayCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Saved successfully to local JSON history database
            </p>
          </div>

          {/* Card 4: Disk Usage */}
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Disk Storage</span>
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2 justify-between w-full">
              <span className="text-2xl font-bold">{diskFreeGb} GB</span>
              <span className="text-xs text-muted-foreground">free of {diskTotalGb} GB</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${100 - diskUsagePercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Column 1 & 2: Active Tasks Queue & Quick Actions */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          
          {/* Active Queue Card */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-5 py-3">
              <h3 className="font-semibold text-sm">Active Downloads Queue</h3>
            </div>
            <div className="p-5">
              {activeDownloads.length === 0 && queuedDownloads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Download className="h-8 w-8 mx-auto opacity-20" />
                  <p>Queue is empty.</p>
                  <button 
                    onClick={() => setActiveView('single')} 
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Start a new download &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.filter(x => x.status !== 'Completed' && x.status !== 'Failed' && x.status !== 'Cancelled' && x.status !== 'Skipped').map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/80 bg-secondary/15 p-4 space-y-3.5">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground line-clamp-1">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-full truncate">{item.url}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                            item.status === 'Downloading' ? 'bg-indigo-500/10 text-indigo-500' :
                            item.status === 'Analyzing' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                            'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {item.status}
                          </span>
                          <button
                            onClick={() => cancelDownload(item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                            title="Cancel task"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar and speeds */}
                      {item.status === 'Downloading' && (
                        <div className="space-y-2">
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300" 
                              style={{ width: `${item.progress}%` }} 
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.progress.toFixed(1)}% ({item.downloadedMb} / {item.totalMb})</span>
                            <div className="flex gap-3">
                              <span>Speed: <strong className="text-foreground">{item.speed}</strong></span>
                              <span>ETA: <strong className="text-foreground">{item.eta}</strong></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Specs and Info */}
          {connected && health && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm">System Resource Dashboard</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between border border-border bg-secondary/10 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span>CPU Usage</span>
                  </div>
                  <span className="font-bold text-sm text-foreground">{health.cpuUsage}%</span>
                </div>
                
                <div className="flex items-center justify-between border border-border bg-secondary/10 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span>Memory Usage</span>
                  </div>
                  <span className="font-bold text-sm text-foreground">{health.memoryUsage.percentageUsed}%</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Column 3: Quick Actions & Recent completed downloads */}
        <div className="space-y-6">
          
          {/* Quick Actions widget */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3.5">
            <h3 className="font-semibold text-sm">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveView('single')} 
                className="w-full flex items-center justify-between rounded-lg border border-border bg-secondary/20 hover:bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-left transition-all"
              >
                <span>Paste Single URL</span>
                <Download className="h-3.5 w-3.5 text-primary" />
              </button>
              <button 
                onClick={() => setActiveView('playlist')} 
                className="w-full flex items-center justify-between rounded-lg border border-border bg-secondary/20 hover:bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-left transition-all"
              >
                <span>Paste Playlist URL</span>
                <ListMusic className="h-3.5 w-3.5 text-primary" />
              </button>
              <button 
                onClick={() => setActiveView('multiple')} 
                className="w-full flex items-center justify-between rounded-lg border border-border bg-secondary/20 hover:bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-left transition-all"
              >
                <span>Bulk URL Downloader</span>
                <ListTodo className="h-3.5 w-3.5 text-primary" />
              </button>
            </div>
          </div>

          {/* Recent Completed downloads */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Downloads</h3>
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-5">
              {loadingHistory ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Loading recent records...</div>
              ) : recentDownloads.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">No recent downloads found.</div>
              ) : (
                <div className="space-y-3.5">
                  {recentDownloads.map((item) => (
                    <div key={item.id} className="text-xs flex flex-col gap-1 border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                      <div className="font-semibold text-foreground truncate">{item.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="capitalize">{item.platform} | {item.quality}</span>
                        <span>{new Date(item.downloadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setActiveView('history')}
                    className="w-full text-center text-xs font-medium text-primary hover:underline mt-2 pt-2 border-t border-border"
                  >
                    View entire download history &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
