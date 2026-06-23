import { describe, it, expect } from 'vitest';
import {
  parseProjectConfig,
  parseEnvKeys,
  autoDetectFromPackageJson,
  autoDetectFromCompose,
} from './projectConfig';

describe('parseEnvKeys', () => {
  it('extracts keys, ignoring comments, blanks and export prefixes', () => {
    const keys = parseEnvKeys('# comment\n\nDATABASE_URL=foo\nexport JWT_SECRET=bar\nEMPTY=\n');
    expect(keys).toEqual(['DATABASE_URL', 'JWT_SECRET', 'EMPTY']);
  });
});

describe('parseProjectConfig', () => {
  it('parses a valid config object', () => {
    const cfg = parseProjectConfig(JSON.stringify({ healthChecks: [{ name: 'API', url: 'http://x/health' }] }));
    expect(cfg.healthChecks?.[0]?.name).toBe('API');
  });

  it('throws on malformed JSON', () => {
    expect(() => parseProjectConfig('{ not json')).toThrow();
  });

  it('throws when the root is not an object', () => {
    expect(() => parseProjectConfig('[1, 2, 3]')).toThrow();
  });
});

describe('autoDetectFromPackageJson', () => {
  it('derives a node tool requirement from engines.node', () => {
    const cfg = autoDetectFromPackageJson(JSON.stringify({ engines: { node: '>=18.0.0' } }));
    expect(cfg.doctor?.tools?.find((t) => t.name === 'node')?.minVersion).toBe('18.0.0');
  });

  it('returns no tools when there are no engines', () => {
    const cfg = autoDetectFromPackageJson(JSON.stringify({}));
    expect(cfg.doctor?.tools ?? []).toEqual([]);
  });
});

describe('autoDetectFromCompose', () => {
  it('extracts service names and their published host ports', () => {
    const compose = [
      'services:',
      '  db:',
      '    image: postgres:16',
      '    ports:',
      '      - "5432:5432"',
      '  cache:',
      '    image: redis',
      '    ports:',
      '      - "6379"',
      '  web:',
      '    image: nginx',
      '    ports:',
      '      - target: 80',
      '        published: 8080',
    ].join('\n');

    expect(autoDetectFromCompose(compose)).toEqual([
      { name: 'db', port: 5432 },
      { name: 'cache', port: 6379 },
      { name: 'web', port: 8080 },
    ]);
  });

  it('ignores services without published ports', () => {
    expect(autoDetectFromCompose('services:\n  worker:\n    image: busybox\n')).toEqual([]);
  });

  it('returns nothing for malformed yaml', () => {
    expect(autoDetectFromCompose(': : : not valid')).toEqual([]);
  });
});
