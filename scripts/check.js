import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTextModule } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (extname(path) === '.js') {
      new SourceTextModule(await readFile(path, 'utf8'), { identifier: path });
      checked++;
    } else if (extname(path) === '.md') {
      const source = await readFile(path, 'utf8');
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split('#')[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        try { await access(resolve(dirname(path), target)); }
        catch { throw new Error(`Broken Markdown link in ${path}: ${target}`); }
      }
    }
  }
}
await check(root);
console.log(`Syntax checked: ${checked} JavaScript files; local Markdown links checked.`);
