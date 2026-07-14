'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { DownloadRecord } from '@/types';
import {
  History,
  Search,
  Trash2,
  FolderOpen,
  Globe,
  FileJson,
  ArrowUpDown,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from './icons';

export default function HistoryView() {
  const { queue } = useAppStore();
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'title' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [queue]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this download record from history? (This will not delete the local file)')) return;

    try {
      const res = await fetch('http://localhost:3001/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFolder = async (downloadPath: string) => {
    try {
      await fetch('http://localhost:3001/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: downloadPath })
      });
    } catch (e) {
      console.error('Failed to open folder:', e);
      // Fallback copy to clipboard
      navigator.clipboard.writeText(downloadPath);
      alert('Copied file path to clipboard: ' + downloadPath);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gan_download_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert('Invalid format: imported JSON must be an array of records.');
          return;
        }

        const res = await fetch('http://localhost:3001/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: parsed })
        });

        if (res.ok) {
          alert('History database imported successfully!');
          fetchHistory();
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Sort and Filter Logic
  const filteredAndSorted = useMemo(() => {
    let result = [...history];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.fileName.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q)
      );
    }

    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter(item => item.platform === platformFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = new Date(a.downloadedAt).getTime();
        const dateB = new Date(b.downloadedAt).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'size') {
        const sizeA = parseFloat(a.fileSize || '0');
        const sizeB = parseFloat(b.fileSize || '0');
        comparison = sizeA - sizeB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [history, searchQuery, platformFilter, sortField, sortOrder]);

  const toggleSort = (field: 'date' | 'title' | 'size') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <YoutubeIcon className="h-4 w-4 text-red-500 shrink-0" />;
      case 'instagram':
        return <InstagramIcon className="h-4 w-4 text-pink-500 shrink-0" />;
      default:
        return <Globe className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Download History</h2>
          <p className="text-sm text-muted-foreground">Manage and filter your saved library logs. Export database configurations.</p>
        </div>
        
        {/* Import/Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card hover:bg-secondary rounded text-xs font-semibold transition-colors"
          >
            <FileJson className="h-3.5 w-3.5" />
            Export JSON
          </button>
          
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card hover:bg-secondary rounded text-xs font-semibold cursor-pointer transition-colors">
            <FolderOpen className="h-3.5 w-3.5" />
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter and search actions bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 border border-border bg-card p-3 rounded-lg shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search downloads by title or file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded bg-secondary/35 border border-border pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-secondary/40 border border-border rounded px-2.5 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    Title {sortField === 'title' && <ArrowUpDown className="h-3 w-3 text-primary" />}
                  </div>
                </th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">
                    Date {sortField === 'date' && <ArrowUpDown className="h-3 w-3 text-primary" />}
                  </div>
                </th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('size')}>
                  <div className="flex items-center gap-1">
                    Size {sortField === 'size' && <ArrowUpDown className="h-3 w-3 text-primary" />}
                  </div>
                </th>
                <th className="px-5 py-3">Quality</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">Loading download logs...</td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">No downloads found matching filters.</td>
                </tr>
              ) : (
                filteredAndSorted.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="px-5 py-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {getPlatformIcon(item.platform)}
                        <span className="capitalize font-medium">{item.platform}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium max-w-[280px] truncate">
                      <div className="truncate" title={item.title}>
                        {item.title}
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate font-mono mt-0.5" title={item.downloadPath}>
                        {item.fileName}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {item.downloadedAt ? new Date(item.downloadedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3 text-foreground font-semibold">{item.fileSize || 'N/A'}</td>
                    <td className="px-5 py-3 font-mono">{item.quality}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleOpenFolder(item.downloadPath)}
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="Open Location & Highlight File"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
