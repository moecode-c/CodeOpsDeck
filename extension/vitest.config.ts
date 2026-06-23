import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

// Unit tests run in plain Node. Modules that import `vscode` resolve to the
// lightweight mock in src/test/__mocks__/vscode.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'src/test/__mocks__/vscode.ts'),
    },
  },
});
