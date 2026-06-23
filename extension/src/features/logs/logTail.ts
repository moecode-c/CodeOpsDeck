import * as vscode from 'vscode';
import { open, stat } from 'node:fs/promises';
import { splitLines } from './logParsing';

/**
 * Tails a single log file (PLAN §6.5): seeds from the last `tailBytes`, then
 * reads only newly-appended bytes on each change. Handles truncation/rotation
 * and buffers partial trailing lines so rows are never split mid-write.
 */
export class LogTail {
  private offset = 0;
  private partial = '';
  private watcher?: vscode.FileSystemWatcher;
  private disposed = false;

  constructor(
    private readonly folder: vscode.WorkspaceFolder,
    private readonly relPath: string,
    private readonly onLines: (lines: string[]) => void,
    private readonly tailBytes = 64 * 1024,
  ) {}

  private get fsPath(): string {
    return vscode.Uri.joinPath(this.folder.uri, this.relPath).fsPath;
  }

  async start(): Promise<void> {
    await this.readNew(true);
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.folder, this.relPath),
    );
    const onChange = () => void this.readNew(false);
    this.watcher.onDidChange(onChange);
    this.watcher.onDidCreate(onChange);
  }

  private async readNew(initial: boolean): Promise<void> {
    if (this.disposed) return;
    let info;
    try {
      info = await stat(this.fsPath);
    } catch {
      return; // file not there yet
    }

    if (initial) this.offset = Math.max(0, info.size - this.tailBytes);
    if (info.size < this.offset) {
      this.offset = 0; // file was truncated/rotated
      this.partial = '';
    }
    if (info.size <= this.offset) return;

    const startedMidFile = initial && this.offset > 0;
    const startOffset = this.offset;
    const length = info.size - startOffset;
    const buffer = Buffer.alloc(length);

    const fd = await open(this.fsPath, 'r');
    try {
      await fd.read(buffer, 0, length, startOffset);
    } finally {
      await fd.close();
    }
    this.offset = info.size;

    const parts = splitLines(this.partial + buffer.toString('utf8'));
    this.partial = parts.pop() ?? '';
    const lines = startedMidFile ? parts.slice(1) : parts; // drop half-line at the window edge
    if (lines.length) this.onLines(lines);
  }

  dispose(): void {
    this.disposed = true;
    this.watcher?.dispose();
  }
}
