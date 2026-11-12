import {build} from 'vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=process.argv[2]||'dist';
if(!/^dist(?:-[a-z0-9]+)?$/.test(destination)) throw Error('INVALID_BUILD_DIRECTORY');
await build({root:path.join(root,'web'),configFile:false,envFile:false,publicDir:false,
  esbuild:{jsx:'automatic'},base:'./',
  build:{outDir:path.join(root,destination),emptyOutDir:false,sourcemap:false,
    rollupOptions:{input:{index:path.join(root,'web/index.html'),portfolio:path.join(root,'web/portfolio-demo.html')}}}});

const {copyFile}=await import('node:fs/promises');
await copyFile(path.join(root,'THIRD_PARTY_NOTICES.txt'),path.join(root,destination,'THIRD_PARTY_NOTICES.txt'));

await copyFile(path.join(root,'LICENSE'),path.join(root,destination,'LICENSE.txt'));
