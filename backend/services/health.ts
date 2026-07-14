import { exec } from 'child_process';
import dns from 'dns';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { SettingsService } from './settings';

export interface HealthStatus {
  backendOnline: boolean;
  ytdlpInstalled: boolean;
  pythonInstalled: boolean;
  ffmpegInstalled: boolean;
  internetAvailable: boolean;
  youtubeReachable: boolean;
  dnsReachable: boolean;
  diskSpace: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percentageUsed: number;
  };
  cpuUsage: number;
  memoryUsage: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percentageUsed: number;
  };
  version: string;
  lastPing: string;
  latency: number; // in ms
}

export class HealthService {
  private static lastCpuMeasure = { time: Date.now(), usage: os.cpus() };

  // Helper to run command and see if it exists
  private static checkCommand(cmd: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(cmd, (error) => {
        resolve(!error);
      });
    });
  }

  // Check internet ping/dns
  private static checkDns(): Promise<boolean> {
    return new Promise((resolve) => {
      dns.lookup('google.com', (err) => {
        resolve(!err);
      });
    });
  }

  private static checkYoutube(): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      dns.lookup('youtube.com', (err) => {
        if (err) {
          resolve(false);
        } else {
          // If we can resolve it, check if we can make a lightweight request
          // Or simply assume it's reachable from DNS
          resolve(true);
        }
      });
    });
  }

  // Calculate CPU Usage percentage
  private static getCpuUsage(): number {
    const startMeasure = this.lastCpuMeasure;
    const endMeasure = { time: Date.now(), usage: os.cpus() };
    
    let startIdle = 0;
    let startTotal = 0;
    for (const cpu of startMeasure.usage) {
      startIdle += cpu.times.idle;
      startTotal += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }

    let endIdle = 0;
    let endTotal = 0;
    for (const cpu of endMeasure.usage) {
      endIdle += cpu.times.idle;
      endTotal += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }

    this.lastCpuMeasure = endMeasure;

    const idleDifference = endIdle - startIdle;
    const totalDifference = endTotal - startTotal;

    if (totalDifference === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((1 - idleDifference / totalDifference) * 100)));
  }

  // Get disk space info safely
  private static getDiskSpace(downloadPath: string) {
    try {
      // Create folder if it doesn't exist to avoid error in statfs
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      // Modern Node.js provides statfsSync
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(downloadPath);
        const free = stats.bavail * stats.bsize;
        const total = stats.blocks * stats.bsize;
        const used = total - free;
        const percentageUsed = total > 0 ? Math.round((used / total) * 100) : 0;
        return {
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          percentageUsed
        };
      }
    } catch (e) {
      console.error('Failed to get disk space via statfsSync:', e);
    }

    // Return dummy/fallback values
    return {
      totalBytes: 512 * 1024 * 1024 * 1024, // 512GB
      freeBytes: 256 * 1024 * 1024 * 1024,
      usedBytes: 256 * 1024 * 1024 * 1024,
      percentageUsed: 50
    };
  }

  public static async getHealth(): Promise<HealthStatus> {
    const settings = SettingsService.getSettings();
    const startTime = Date.now();

    // Check binaries
    const ytdlpInstalled = await this.checkCommand(`"${settings.ytdlpPath}" --version`);
    const ffmpegInstalled = await this.checkCommand(`"${settings.ffmpegPath}" -version`);
    // Python can be checked via 'py --version' on Windows
    const pythonInstalled = await this.checkCommand('py --version');

    // Check connectivity
    const dnsReachable = await this.checkDns();
    const youtubeReachable = await this.checkYoutube();
    const internetAvailable = dnsReachable;

    // Latency
    const latency = Date.now() - startTime;

    // Disk space
    const diskSpace = this.getDiskSpace(settings.downloadFolder);

    // Memory Usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memPercentage = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

    return {
      backendOnline: true,
      ytdlpInstalled,
      pythonInstalled,
      ffmpegInstalled,
      internetAvailable,
      youtubeReachable,
      dnsReachable,
      diskSpace,
      cpuUsage: this.getCpuUsage(),
      memoryUsage: {
        totalBytes: totalMemory,
        freeBytes: freeMemory,
        usedBytes: usedMemory,
        percentageUsed: memPercentage
      },
      version: '1.0.0',
      lastPing: new Date().toISOString(),
      latency
    };
  }
}
