const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
const root = path.resolve('desktop-release');
const archives = [];
function visit(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) visit(p);
    else if (e.name === 'app.asar') archives.push(p);
  }
}
visit(root);
if (archives.length !== 1) throw Error('Expected exactly one packaged app archive');
const archive = archives[0], files = asar.listPackage(archive).map(p => p.replaceAll('\\', '/').replace(/^\//, ''));
const blocked = files.filter(p => /\.(?:sqlite(?:-.*)?|db(?:-.*)?|mp3|wav|flac|m4a|aac|ogg|webm|pem|key|pfx|p12)$/i.test(p) || /(?:^|\/)(?:data|music|output|versions)\/|(?:^|\/)\.env(?:$|\.)/i.test(p));
if (blocked.length) throw Error('Unexpected private/distribution files: ' + blocked.join(', '));
for (const file of ['LICENSE', 'ASSET-LICENSE.md', 'platform.cjs', 'icon.png', 'main.cjs', 'server.mjs']) {
  if (!files.includes(file)) throw Error('Missing packaged file: ' + file);
}
if (!asar.extractFile(archive, 'LICENSE').toString().includes('2026 CheJ')) throw Error('Copyright attribution mismatch');
const pkg = JSON.parse(asar.extractFile(archive, 'package.json'));
if (pkg.version !== require('../package.json').version) throw Error('Version mismatch');
console.log(JSON.stringify({ auditPassed: true, version: pkg.version, entries: files.length, bundledMusic: false }));
