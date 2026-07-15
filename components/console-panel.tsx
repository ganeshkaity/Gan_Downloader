'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { Terminal, Copy, Trash2, Check, ExternalLink, Activity, List, Info } from 'lucide-react';

export default function ConsolePanel() {
  const { queue, selectedQueueItemId, logMap, setSelectedQueueItemId } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'simplified' | 'details'>('raw');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // If no item is selected, find the first active downloading/analyzing item
  const activeItemId = selectedQueueItemId || queue.find(
    item => item.status === 'Downloading' || item.status === 'Analyzing'
  )?.id || queue[0]?.id || null;

  const activeItem = queue.find(item => item.id === activeItemId) || null;
  const logs = activeItemId ? logMap[activeItemId] || [] : [];

  // Scroll to bottom when logs update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopy = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!activeItemId) return;
    // Clear logs in the store local state
    useAppStore.setState((state) => {
      const newLogMap = { ...state.logMap };
      newLogMap[activeItemId] = [];
      return { logMap: newLogMap };
    });
  };

  // Compute Details tab variables
  const totalQueued = queue.filter(item => item.status === 'Queued').length;
  const totalRemaining = queue.filter(item => ['Queued', 'Waiting', 'Analyzing', 'Downloading'].includes(item.status)).length;
  const videosDownloaded = queue.filter(item => item.status === 'Completed').length;
  const activeDownloads = queue.filter(item => item.status === 'Downloading');
  const currentSpeed = activeDownloads.length > 0 ? activeDownloads[0].speed : '0 B/s';
  const avgTime = activeDownloads.length > 0 ? activeDownloads[0].eta : '--:--';

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-black shadow-lg overflow-hidden font-mono text-xs">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'raw' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Raw Logs</span>
          </button>
          <button 
            onClick={() => setActiveTab('simplified')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'simplified' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Simplified</span>
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'details' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Details</span>
          </button>

          {activeItem && activeTab === 'raw' && (
            <span className="text-[10px] text-zinc-500 border-l border-zinc-800 pl-2 ml-1 max-w-[150px] truncate hidden sm:block">
              {activeItem.title}
            </span>
          )}
        </div>

        {/* Target Select */}
        <div className="flex items-center gap-2">
          {queue.length > 0 && activeTab === 'raw' && (
            <select
              value={activeItemId || ''}
              onChange={(e) => setSelectedQueueItemId(e.target.value || null)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary max-w-[120px] sm:max-w-[180px]"
            >
              {queue.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.status}] {item.title.substring(0, 20)}...
                </option>
              ))}
            </select>
          )}

          {activeTab === 'raw' && (
            <>
              <button
                onClick={handleCopy}
                disabled={logs.length === 0}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Copy Logs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={handleClear}
                disabled={logs.length === 0}
                className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Clear Log Screen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 p-4 bg-zinc-950 overflow-y-auto text-zinc-300 h-[250px] md:h-auto min-h-[180px] scrollbar-thin scrollbar-thumb-zinc-800">
        
        {activeTab === 'raw' && (
          <div className="space-y-1">
            {logs.length > 0 ? (
              logs.map((log, idx) => {
                let colorClass = 'text-zinc-300';
                if (log.startsWith('[ERROR]')) {
                  colorClass = 'text-red-400 font-semibold';
                } else if (log.includes('Destination:')) {
                  colorClass = 'text-sky-400';
                } else if (log.includes('[download]') && log.includes('%')) {
                  colorClass = 'text-emerald-400';
                } else if (log.startsWith('Spawning yt-dlp')) {
                  colorClass = 'text-yellow-500';
                }

                return (
                  <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${colorClass}`}>
                    <span className="text-zinc-600 select-none mr-2 font-light">{(idx + 1).toString().padStart(3, '0')}</span>
                    {log}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-1.5 py-8">
                <Terminal className="h-8 w-8 opacity-20" />
                <p>No active terminal logs stream.</p>
                <p className="text-[10px]">Start a download to inspect progress logs.</p>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        )}

        {activeTab === 'simplified' && (
          <div className="flex flex-col gap-3 font-sans">
            {queue.length > 0 ? (
              [...queue].reverse().map(item => {
                let badgeColor = 'text-zinc-400 bg-zinc-400/10 border-zinc-500/20';
                let progressColor = 'bg-zinc-500';
                
                if (item.status === 'Downloading') {
                  badgeColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
                  progressColor = 'bg-emerald-500';
                } else if (item.status === 'Analyzing') {
                  badgeColor = 'text-sky-400 bg-sky-400/10 border-sky-500/20';
                } else if (item.status === 'Completed') {
                  badgeColor = 'text-teal-400 bg-teal-400/10 border-teal-500/20';
                  progressColor = 'bg-teal-500';
                } else if (item.status === 'Failed') {
                  badgeColor = 'text-rose-400 bg-rose-400/10 border-rose-500/20';
                  progressColor = 'bg-rose-500';
                } else if (item.status === 'Queued' || item.status === 'Waiting') {
                  badgeColor = 'text-amber-400 bg-amber-400/10 border-amber-500/20';
                  progressColor = 'bg-amber-500';
                }

                return (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-semibold text-zinc-100 truncate pr-4 flex-1">{item.title || item.url}</h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 border ${badgeColor}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    {/* Render progress bar for statuses that have/had progress */}
                    {(item.status === 'Downloading' || item.status === 'Completed' || item.status === 'Failed') && (
                      <>
                        <div className="w-full bg-zinc-800 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                            style={{ width: `${item.status === 'Completed' ? 100 : (item.progress || 0)}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-zinc-400 mt-1">
                          <div className="flex gap-4">
                            <span>{item.status === 'Completed' ? '100.0%' : `${item.progress?.toFixed(1) || '0.0'}%`}</span>
                            <span className="text-zinc-300">{item.downloadedMb || '0MB'} / {item.totalMb || '?MB'}</span>
                          </div>
                          {item.status === 'Downloading' && (
                            <div className="flex gap-4 text-right">
                              <span className="text-emerald-400">{item.speed || '0MiB/s'}</span>
                              <span className="text-amber-400/90">{item.eta || '--:--'}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {item.status === 'Analyzing' && (
                      <div className="text-xs text-zinc-500 italic mt-1 animate-pulse">Gathering media information...</div>
                    )}

                    {(item.status === 'Queued' || item.status === 'Waiting') && (
                      <div className="text-xs text-zinc-500 italic mt-1">Waiting in queue...</div>
                    )}

                    {item.status === 'Failed' && item.error && (
                      <div className="text-[10px] text-rose-400/90 bg-rose-950/20 border border-rose-500/10 rounded px-2 py-1 mt-1 truncate">
                        Error: {item.error}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-1.5 py-8">
                <List className="h-8 w-8 opacity-20" />
                <p>No active downloads.</p>
                <p className="text-[10px]">Active items will appear here.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'details' && (
          <div className="flex flex-col h-full font-sans justify-center p-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Remaining</div>
                <div className="text-xl font-bold text-zinc-100 mt-1">{totalRemaining}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Queued</div>
                <div className="text-xl font-bold text-zinc-100 mt-1">{totalQueued}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Completed</div>
                <div className="text-xl font-bold text-zinc-100 mt-1">{videosDownloaded}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Speed</div>
                <div className="text-xl font-bold text-emerald-400 mt-1 truncate">{currentSpeed}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">ETA</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{avgTime}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
