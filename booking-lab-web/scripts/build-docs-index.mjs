#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(WEB_ROOT, '../..');
const OUT = resolve(WEB_ROOT, 'public/docs-index.json');
const HOME = process.env.HOME || '';

// Search paths tried in order — env override, sibling to booking-lab,
// Documents/GitHub, Desktop. Silently skip any repo not on disk.
const CANDIDATE_ROOTS = [
  process.env.HPH_REPO_ROOT,
  REPO_ROOT,
  join(HOME, 'Documents/GitHub'),
  join(HOME, 'Desktop'),
].filter(Boolean);

function findRepoRoot(name) {
  for (const root of CANDIDATE_ROOTS) {
    try {
      const p = resolve(root, name);
      statSync(p);
      return p;
    } catch {
      // try next candidate
    }
  }
  return null;
}

const SOURCES = [
  {
    repo: 'HPH.Core.API',
    root: findRepoRoot('HPH.Core.API'),
    patterns: [
      'doc/**/*.md',
      'src/HPH.Core.API.GraphQL/Entities/**/*.cs',
      'src/HPH.Core.API.Repo/Models/**/*.cs',
    ],
    baseUrl: 'https://github.com/TeamGenius/HPH.Core.API/blob/master/',
  },
  {
    repo: 'HPH.Admin.Web',
    root: findRepoRoot('HPH.Admin.Web'),
    patterns: ['doc/**/*.md'],
    baseUrl: 'https://github.com/TeamGenius/HPH.Admin.Web/blob/master/',
  },
];

const CHUNK_SIZE = 800;
const OVERLAP = 100;
const MAX_TOTAL_BYTES = 800 * 1024;

function tryGitLs(root, patterns) {
  try {
    const args = patterns.map((p) => `'${p}'`).join(' ');
    const out = execSync(`git ls-files -z ${args}`, {
      cwd: root,
      maxBuffer: 32 * 1024 * 1024,
    })
      .toString('utf8')
      .split('\0')
      .filter(Boolean);
    return out;
  } catch (err) {
    console.warn(`  git ls-files failed for ${root}: ${err.message}`);
    return null;
  }
}

function chunkText(text) {
  const clean = text.replace(/\r\n/g, '\n');
  const chunks = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(i, end));
    if (end >= clean.length) break;
    i = end - OVERLAP;
  }
  return chunks;
}

function firstTitle(text, path) {
  const md = text.match(/^\s*#\s+(.+?)\s*$/m);
  if (md) return md[1];
  const cls = text.match(/(?:public|internal)\s+(?:class|record|struct|interface)\s+(\w+)/);
  if (cls) return `${cls[1]} (${basename(path)})`;
  return basename(path);
}

function main() {
  const records = [];
  let totalBytes = 0;
  let truncated = false;

  for (const src of SOURCES) {
    console.log(`Indexing ${src.repo} @ ${src.root || '(not found)'}`);
    if (!src.root) {
      console.log('  skipped — repo not on disk');
      continue;
    }
    const files = tryGitLs(src.root, src.patterns);
    if (!files) continue;
    console.log(`  ${files.length} candidate files`);
    for (const rel of files) {
      const abs = join(src.root, rel);
      let text;
      try {
        text = readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      if (!text.trim()) continue;
      const title = firstTitle(text, rel);
      const ext = extname(rel);
      const kind = ext === '.md' ? 'doc' : ext === '.cs' ? 'code' : 'other';
      const chunks = chunkText(text);
      for (let c = 0; c < chunks.length; c++) {
        const body = chunks[c];
        const rec = {
          id: `${src.repo}::${rel}#${c}`,
          repo: src.repo,
          path: rel,
          title,
          kind,
          url: src.baseUrl + rel.split(/\\|\//).join('/'),
          text: body,
        };
        const size = JSON.stringify(rec).length;
        if (totalBytes + size > MAX_TOTAL_BYTES) {
          truncated = true;
          break;
        }
        totalBytes += size;
        records.push(rec);
      }
      if (truncated) break;
    }
    if (truncated) {
      console.warn(`  truncated at ${MAX_TOTAL_BYTES} bytes; skipping the rest`);
      break;
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      { built: new Date().toISOString(), records, truncated },
      null,
      0,
    ),
  );
  console.log(
    `Wrote ${records.length} chunks (${(totalBytes / 1024).toFixed(1)} KB) to ${relative(WEB_ROOT, OUT)}`,
  );
}

main();
