// Bundles the extension to dist/extension.js. esbuild is the PLAN §3 bundler:
// fast, tiny output. `vscode` is provided by the host, so it stays external.
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const context = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    outfile: 'dist/extension.js',
    // `vscode` is host-provided. `ssh2` is a heavy dockerode dependency only
    // loaded for ssh:// Docker hosts, which we never use (local socket/pipe) —
    // keeping it external trims ~800 KB off the bundle.
    external: ['vscode', 'ssh2'],
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
  });

  if (watch) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
