/**
 * Minimal stand-in for the `vscode` module, aliased in `vitest.config.ts`.
 * Only the surface used by the core/feature modules is implemented — enough for
 * unit tests to import vscode-touching code without a real extension host.
 */

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class TreeItem {
  description?: string;
  tooltip?: string;
  iconPath?: unknown;
  constructor(public label: string) {}
}

export const window = {
  createOutputChannel: () => ({
    appendLine: (_line: string) => {},
    append: (_value: string) => {},
    show: (_preserveFocus?: boolean) => {},
    clear: () => {},
    dispose: () => {},
    name: 'mock',
  }),
  createStatusBarItem: () => ({
    text: '',
    tooltip: '' as string | undefined,
    command: '' as string | undefined,
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  registerTreeDataProvider: () => ({ dispose: () => {} }),
  onDidChangeWindowState: () => ({ dispose: () => {} }),
  state: { focused: true },
};

export const workspace = {
  getConfiguration: () => ({ get: <T>(_key: string, fallback: T): T => fallback }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: () => Promise.resolve(undefined),
};

export interface Disposable {
  dispose(): void;
}
