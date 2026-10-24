const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/handlers/cases.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/handlers/cases.js',
  external: [], // bundle everything including AWS SDK
}).catch(() => process.exit(1));
