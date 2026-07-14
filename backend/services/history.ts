import fs from 'fs';
import path from 'path';

export interface DownloadRecord {
  id: string;
  title: string;
  normalizedTitle: string;
  url: string;
  platform: string;
  downloadedAt: string;
  fileName: string;
  quality: string;
  downloadPath: string;
  duration: string;
  hash: string;
  fileSize?: string;
}

const HISTORY_PATH = path.join(__dirname, '..', 'history', 'downloads.json');

export class HistoryService {
  public static getHistory(): DownloadRecord[] {
    try {
      if (fs.existsSync(HISTORY_PATH)) {
        const data = fs.readFileSync(HISTORY_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read download history database', error);
    }
    return [];
  }

  public static addRecord(record: DownloadRecord): DownloadRecord[] {
    const history = this.getHistory();
    history.unshift(record); // Add to the beginning
    this.saveHistory(history);
    return history;
  }

  public static deleteRecord(id: string): DownloadRecord[] {
    const history = this.getHistory();
    const updated = history.filter(item => item.id !== id);
    this.saveHistory(updated);
    return updated;
  }

  public static clearHistory(): DownloadRecord[] {
    this.saveHistory([]);
    return [];
  }

  public static importHistory(records: DownloadRecord[]): DownloadRecord[] {
    if (!Array.isArray(records)) {
      throw new Error('Invalid history format: must be an array');
    }
    this.saveHistory(records);
    return records;
  }

  private static saveHistory(history: DownloadRecord[]): void {
    try {
      const dir = path.dirname(HISTORY_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write download history database', error);
    }
  }

  // Utility to normalize title
  public static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD') // Normalize unicode accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .replace(/[^a-z0-9\s]/g, '') // Keep only letters, digits, and spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  // Check for duplicates
  public static checkDuplicate(title: string, url: string): DownloadRecord | null {
    const history = this.getHistory();
    const normalizedTarget = this.normalizeTitle(title);

    // Try finding by exact URL match first
    const urlMatch = history.find(item => item.url === url);
    if (urlMatch) {
      return urlMatch;
    }

    // Try finding by normalized title match
    const titleMatch = history.find(
      item => item.normalizedTitle === normalizedTarget && normalizedTarget.length > 2
    );
    return titleMatch || null;
  }
}
