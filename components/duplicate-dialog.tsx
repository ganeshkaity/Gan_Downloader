'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, FileText, Calendar, Check, X } from 'lucide-react';

interface DuplicateDialogProps {
  isOpen: boolean;
  title: string;
  duplicateInfo: {
    title: string;
    downloadedAt: string;
    fileName: string;
    downloadPath: string;
  } | null;
  onResolve: (action: 'skip' | 'download_anyway' | 'rename' | 'overwrite', renameVal?: string) => void;
  onClose: () => void;
}

export default function DuplicateDialog({
  isOpen,
  title,
  duplicateInfo,
  onResolve,
  onClose
}: DuplicateDialogProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  if (!isOpen || !duplicateInfo) return null;

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onResolve('rename', newFileName.trim());
      setIsRenaming(false);
      setNewFileName('');
    }
  };

  const formattedDate = duplicateInfo.downloadedAt
    ? new Date(duplicateInfo.downloadedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Unknown Date';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-xs"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg leading-none tracking-tight flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                Duplicate Found
              </h3>
              <p className="text-sm text-muted-foreground">
                This media already exists in your local history database.
              </p>
            </div>
          </div>

          {/* Details Body */}
          <div className="my-5 rounded-lg border border-border bg-secondary/20 p-4.5 space-y-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Title</div>
              <div className="font-medium text-foreground line-clamp-1">{title}</div>
            </div>

            <div className="border-t border-border/60 my-2" />

            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span>Downloaded on: <strong className="text-foreground">{formattedDate}</strong></span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold">Existing File</span>
                  <span className="block font-medium text-foreground break-all line-clamp-2">{duplicateInfo.fileName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-4">
            {!isRenaming ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onResolve('skip')}
                  className="flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    const ext = duplicateInfo.fileName.split('.').pop() || 'mp4';
                    const baseName = duplicateInfo.fileName.replace(/\.[^/.]+$/, '');
                    setNewFileName(`${baseName}_new.${ext}`);
                    setIsRenaming(true);
                  }}
                  className="flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => onResolve('overwrite')}
                  className="flex items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-2 text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Overwrite
                </button>
                <button
                  onClick={() => onResolve('download_anyway')}
                  className="flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/95 shadow-xs transition-colors"
                >
                  Download Anyway
                </button>
              </div>
            ) : (
              <form onSubmit={handleRenameSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="rename-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enter Custom Filename</label>
                  <input
                    id="rename-input"
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="song_alternative.mp4"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex h-9 items-center justify-center rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Confirm Rename
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
