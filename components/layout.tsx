'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  FileText,
  Camera,
  Search,
  Music,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { InstagramIcon } from './icons';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { activeView, setActiveView, theme, setTheme, connected, health } = useAppStore();

  // open: is the panel visible?
  // pinned: did the user explicitly click to lock it open?
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard, desc: 'Overview & active downloads' },
    { id: 'single',     label: 'Single Video',       icon: Download,        desc: 'Download one video at a time' },
    { id: 'yt_shorts',  label: 'YT Shorts',          icon: Video,           desc: 'Shorts & videos with dynamic formats' },
    { id: 'playlist',   label: 'Playlist',           icon: ListMusic,       desc: 'Batch-download entire playlists' },
    { id: 'multiple',   label: 'Multiple URLs',      icon: ListTodo,        desc: 'Download from a list of URLs' },
    { id: 'instagram',  label: 'Instagram',          icon: InstagramIcon,   desc: 'Reels, stories & posts' },
    { id: 'insta_images', label: 'Instagram Images', icon: Camera,          desc: 'Download Instagram photos' },
    { id: 'thumbnail',  label: 'YT Thumbnail',       icon: ImageIcon,       desc: 'Download cover art images' },
    { id: 'subtitle',   label: 'YT Subtitles',       icon: FileText,        desc: 'Download video subtitle tracks' },
    { id: 'yt_search',  label: 'YT Search Download', icon: Search,          desc: 'Search & download directly' },
    { id: 'song_list',  label: 'Song List Download', icon: Music,           desc: 'Batch search & download songs' },
    { id: 'history',    label: 'History',            icon: History,         desc: 'View past downloads' },
    { id: 'settings',   label: 'Settings',           icon: Settings,        desc: 'Configure paths & preferences' },
  ];

  const activeItem = navItems.find(n => n.id === activeView);

  /* ── Close on outside click or Escape ── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setPinned(false); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  /* ── Hover open (120 ms delay) ── */
  const handleMouseEnter = () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverOpenTimer.current = setTimeout(() => setOpen(true), 120);
  };

  /* ── Hover close — only if NOT pinned (200 ms grace) ── */
  const handleMouseLeave = () => {
    if (hoverOpenTimer.current) clearTimeout(hoverOpenTimer.current);
    if (!pinned) {
      hoverCloseTimer.current = setTimeout(() => setOpen(false), 200);
    }
  };

  /* ── Click: toggle pinned state ── */
  const handleButtonClick = () => {
    if (pinned) {
      // Already pinned — unpin and close
      setPinned(false);
      setOpen(false);
    } else {
      // Pin it open
      setPinned(true);
      setOpen(true);
    }
  };

  const navigate = (id: string) => {
    setActiveView(id);
    setOpen(false);
    setPinned(false);
  };

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

      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 gap-4">

          {/* ── Left: Logo ── */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => setActiveView('dashboard')}
          >
            <div className="relative h-9 w-9 shrink-0">
              <Image
                src="/logo.png"
                alt="Gan Downloader Logo"
                fill
                sizes="36px"
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            <span className="font-bold tracking-tight text-base hidden sm:block">
              Gan Downloader
            </span>
          </div>

          {/* ── Centre: "More Options" hamburger ── */}
          <div
            ref={menuRef}
            className="relative flex justify-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Trigger */}
            <button
              onClick={handleButtonClick}
              aria-label="Navigation menu"
              aria-expanded={open}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150 select-none ${
                open
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-inner shadow-primary/10'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border/80'
              }`}
            >
              {/* Animated bars */}
              <span className="relative flex h-4 w-4 flex-col justify-between overflow-hidden shrink-0">
                <span className={`block h-0.5 w-full bg-current rounded-full origin-center transition-all duration-200 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
                <span className={`block h-0.5 w-full bg-current rounded-full transition-all duration-200 ${open ? 'opacity-0 -translate-x-3' : ''}`} />
                <span className={`block h-0.5 w-full bg-current rounded-full origin-center transition-all duration-200 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
              </span>

              <span>More Options</span>

              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />

              {/* "pinned" badge */}
              {pinned && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Pinned open" />
              )}
            </button>

            {/* ── Dropdown panel ── */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-[calc(100vw-2rem)] sm:w-[600px] md:w-[800px] max-w-4xl rounded-xl border border-border bg-card shadow-2xl shadow-black/25 overflow-hidden transition-all duration-200 origin-top z-50 ${
                open
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }`}
            >
              {/* Panel header */}
              <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Navigation</span>
                  {pinned && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold border border-primary/20">
                      Pinned
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setOpen(false); setPinned(false); }}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Nav items */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-100 ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        isActive ? 'bg-primary/20 text-primary' : 'bg-secondary/60 group-hover:bg-secondary'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-medium leading-tight ${isActive ? 'text-primary' : ''} truncate`}>
                          {item.label}
                        </span>
                        <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                          {item.desc}
                        </span>
                      </span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Panel footer */}
              <div className="px-4 py-2 border-t border-border bg-secondary/20 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor()} animate-pulse`} />
                <span>{getStatusText()}</span>
                {connected && health && (
                  <span className="ml-auto">{health.latency}ms</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Health + Theme + Avatar ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Health monitor */}
            <div className="group relative flex items-center gap-2 cursor-default px-2.5 py-1 rounded-md border border-border bg-secondary/30 text-xs">
              <span className={`h-2 w-2 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="font-medium hidden sm:inline">{getStatusText()}</span>
              {connected && health && (
                <span className="text-[10px] text-muted-foreground border-l border-border pl-1.5">{health.latency}ms</span>
              )}

              {/* Health hovercard */}
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <h4 className="font-semibold text-sm border-b border-border pb-2 mb-3">System Backend Health</h4>
                {connected && health ? (
                  <div className="space-y-3.5 text-sm">
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

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-xs text-primary shadow-xs">
              GK
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
