import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";

export interface PoolFile {
  filename: string;
  content: string;
  size: number;
  lastModified: Date;
}

export interface PoolData {
  files: PoolFile[];
  totalFiles: number;
  totalSize: number;
  lastScanned: Date;
}

/**
 * Reads all .md files from the /pool directory and returns their content
 * for use in RAG (Retrieval-Augmented Generation) system
 */
export class PoolDataReader {
  private poolPath: string;

  constructor(poolPath: string = "pool") {
    this.poolPath = poolPath;
  }

  /**
   * Scans the pool directory and reads all .md files
   */
  async readPoolData(): Promise<PoolData> {
    try {
      // Check if pool directory exists
      try {
        await stat(this.poolPath);
      } catch (error) {
        console.warn(`Pool directory ${this.poolPath} does not exist`);
        return {
          files: [],
          totalFiles: 0,
          totalSize: 0,
          lastScanned: new Date()
        };
      }

      const files = await readdir(this.poolPath);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      const poolFiles: PoolFile[] = [];
      let totalSize = 0;

      for (const filename of mdFiles) {
        try {
          const filePath = join(this.poolPath, filename);
          const content = await readFile(filePath, 'utf-8');
          const stats = await stat(filePath);
          
          const poolFile: PoolFile = {
            filename,
            content,
            size: stats.size,
            lastModified: stats.mtime
          };
          
          poolFiles.push(poolFile);
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Failed to read file ${filename}:`, error);
        }
      }

      return {
        files: poolFiles,
        totalFiles: poolFiles.length,
        totalSize,
        lastScanned: new Date()
      };
    } catch (error) {
      console.error('Failed to read pool directory:', error);
      return {
        files: [],
        totalFiles: 0,
        totalSize: 0,
        lastScanned: new Date()
      };
    }
  }

  /**
   * Gets a summary of pool data without reading full content
   */
  async getPoolSummary(): Promise<{
    totalFiles: number;
    totalSize: number;
    filenames: string[];
    lastScanned: Date;
  }> {
    try {
      // Check if pool directory exists
      try {
        await stat(this.poolPath);
      } catch (error) {
        console.warn(`Pool directory ${this.poolPath} does not exist`);
        return {
          totalFiles: 0,
          totalSize: 0,
          filenames: [],
          lastScanned: new Date()
        };
      }

      const files = await readdir(this.poolPath);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      let totalSize = 0;
      const filenames: string[] = [];

      for (const filename of mdFiles) {
        try {
          const filePath = join(this.poolPath, filename);
          const stats = await stat(filePath);
          totalSize += stats.size;
          filenames.push(filename);
        } catch (error) {
          console.warn(`Failed to get stats for file ${filename}:`, error);
        }
      }

      return {
        totalFiles: mdFiles.length,
        totalSize,
        filenames,
        lastScanned: new Date()
      };
    } catch (error) {
      console.error('Failed to get pool summary:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filenames: [],
        lastScanned: new Date()
      };
    }
  }

  /**
   * Formats pool data for AI context
   */
  formatForAI(poolData: PoolData): string {
    if (poolData.files.length === 0) {
      return "No data pool files available.";
    }

    let context = `# Data Pool Context (${poolData.totalFiles} files, ${this.formatBytes(poolData.totalSize)})\n\n`;
    context += `Last scanned: ${poolData.lastScanned.toISOString()}\n\n`;

    for (const file of poolData.files) {
      context += `## ${file.filename}\n`;
      context += `Size: ${this.formatBytes(file.size)}\n`;
      context += `Last modified: ${file.lastModified.toISOString()}\n\n`;
      context += file.content;
      context += "\n\n---\n\n";
    }

    return context;
  }

  /**
   * Formats bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
export const poolDataReader = new PoolDataReader();
