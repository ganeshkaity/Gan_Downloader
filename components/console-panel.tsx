'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { Terminal, Copy, Trash2, Check, ExternalLink } from 'lucide-react';

export default function ConsolePanel() {
  const { queue, selectedQueueItemId, logMap, setSelectedQueueItemId } = useAppStore();
  const [copied, setCopied] = useState(false);
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

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-black shadow-lg overflow-hidden font-mono text-xs">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2 text-zinc-400 font-semibold">
          <Terminal className="h-4 w-4 text-primary" />
          <span>Live Console Console</span>
          {activeItem && (
            <span className="text-[10px] text-zinc-500 border-l border-zinc-800 pl-2 max-w-[150px] truncate">
              {activeItem.title}
            </span>
          )}
        </div>

        {/* Target Select */}
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <select
              value={activeItemId || ''}
              onChange={(e) => setSelectedQueueItemId(e.target.value || null)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {queue.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.status}] {item.title.substring(0, 20)}...
                </option>
              ))}
            </select>
          )}

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
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-4 bg-zinc-950 overflow-y-auto text-zinc-300 space-y-1 h-[250px] md:h-auto min-h-[180px] scrollbar-thin scrollbar-thumb-zinc-800">
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
    </div>
  );
}
