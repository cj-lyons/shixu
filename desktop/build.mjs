import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bundledTracks } from '../src/bundled-music.ts';
import { checkMusicAssets } from '../scripts/check-music-assets.mjs';
checkMusicAssets(path.resolve('dist/audio'));
const devMode = process.argv.includes('--dev');
const root = process.cwd(), target = path.join(root, devMode ? 'desktop/dev-app' : 'desktop/app');
await mkdir(target, { recursive: true });
await build({ entryPoints: ['server/index.mjs'], outfile: path.join(target, 'server.mjs'), bundle: true, platform: 'node', format: 'esm', target: 'node24', external: ['node:*'] });
await cp('dist', path.join(target, 'dist'), { recursive: true });
checkMusicAssets(path.join(target,'dist','audio'));
await cp('desktop/main.cjs', path.join(target, 'main.cjs'));
await cp('desktop/preload.cjs', path.join(target, 'preload.cjs'));
await cp('desktop/reminders.cjs', path.join(target, 'reminders.cjs'));
await cp('desktop/tray-controls.cjs', path.join(target, 'tray-controls.cjs'));
await writeFile(path.join(target,'music-catalog.json'),JSON.stringify(bundledTracks.map(({id,title})=>({id,title}))));
await cp(devMode ? 'desktop/dev-icon.ico' : 'desktop/icon.ico', path.join(target, 'icon.ico'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await cp('LICENSE', path.join(target, 'LICENSE'));
await cp('ASSET-LICENSE.md', path.join(target, 'ASSET-LICENSE.md'));
await writeFile(path.join(target, 'package.json'), JSON.stringify({ name: 'shixu-desktop', productName: '拾序', version: '1.8.1', description: '拾序个人任务与精力管理桌面版', author: 'Shixu', main: 'main.cjs', license: pkg.license || 'MIT', private: true }, null, 2));
await writeFile(path.join(target, 'THIRD-PARTY-NOTICES.txt'), 'Shixu Desktop\nElectron: MIT; Node.js and Chromium notices ship alongside the executable.\nReact, React DOM, Lucide React, Zod: MIT / ISC.\n\n' + await readFile('node_modules/zod/LICENSE', 'utf8'));
for (const name of Object.keys(pkg.dependencies)) {
  for (const file of ['LICENSE', 'LICENSE.txt']) {
    try { await cp(path.join('node_modules', name, file), path.join(target, `${name.replaceAll('/', '-')}-LICENSE.txt`)); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
console.log('Desktop staging ready: no account, database, or environment files included.');
