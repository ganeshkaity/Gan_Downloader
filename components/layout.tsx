'use client';

import React from 'react';
import { useAppStore } from '@/store';
import {
  LayoutDashboard,
  Download,
  ListMusic,
  ListTodo,
  History,
  Settings,
  Sun,
  Moon,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Check,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon } from './icons';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { 
    activeView, 
    setActiveView, 
    theme, 
    setTheme, 
    connected, 
    health 
  } = useAppStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'single', label: 'Single Video', icon: Download },
    { id: 'playlist', label: 'Playlist', icon: ListMusic },
    { id: 'multiple', label: 'Multiple URLs', icon: ListTodo },
    { id: 'instagram', label: 'Instagram', icon: InstagramIcon },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusColor = () => {
    if (!connected) return 'bg-red-500';
    if (!health?.internetAvailable) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (!connected) return 'Offline';
    if (!health?.internetAvailable) return 'No Internet';
    return 'Online';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/30">
              <Download className="h-4.5 w-4.5" />
            </div>
            <span className="font-semibold tracking-tight text-lg">Gan Downloader</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-secondary text-primary shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Real-time Health Monitor Widget */}
            <div className="group relative flex items-center gap-2 cursor-default px-2.5 py-1 rounded-md border border-border bg-secondary/30 text-xs">
              <span className={`h-2 w-2 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="font-medium">{getStatusText()}</span>
              {connected && health && (
                <span className="text-[10px] text-muted-foreground border-l border-border pl-1.5">{health.latency}ms</span>
              )}

              {/* Health Hovercard */}
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <h4 className="font-semibold text-sm border-b border-border pb-2 mb-3">System Backend Health</h4>
                
                {connected && health ? (
                  <div className="space-y-3.5 text-sm">
                    {/* CPU & Memory status */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="h-3 w-3" /> CPU Usage</span>
                        <span>{health.cpuUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${health.cpuUsage}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="h-3 w-3" /> Memory Usage</span>
                        <span>{health.memoryUsage.percentageUsed}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${health.memoryUsage.percentageUsed}%`, backgroundColor: health.memoryUsage.percentageUsed > 85 ? '#f87171' : undefined }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><HardDrive className="h-3 w-3" /> Disk Free</span>
                        <span>{((health.diskSpace.freeBytes || 0) / (1024 ** 3)).toFixed(1)} GB free</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${health.diskSpace.percentageUsed}%` }} />
                      </div>
                    </div>

                    {/* Binaries checks */}
                    <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {health.ytdlpInstalled ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span>yt-dlp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {health.ffmpegInstalled ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span>FFmpeg</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {health.pythonInstalled ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span>Python (py)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {health.internetAvailable ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span>Internet</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to reach Node backend. Ensure Express server is running on port 3001.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Profile Placeholder */}
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-xs text-primary shadow-xs">
              GK
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
