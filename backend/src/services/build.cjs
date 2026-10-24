const esbuild = require('esbuild');

const handlers = ['cases', 'donations', 'users', 'audit'];

Promise.all(
  handlers.map((name) =>
    esbuild.build({
      entryPoints: [`src/handlers/${name}.ts`],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: `dist/handlers/${name}.js`,
    })
  )
)
  .then(() => console.log('Build successful'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
