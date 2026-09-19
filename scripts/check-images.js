/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = './src/_gallery_source';
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const CONCURRENCY = 4;

function collectFiles(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else if (IMAGE_RE.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const files = collectFiles(ROOT, []);

let cursor = 0;
const errors = [];

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    try {
      await sharp(file).resize({ width: 16 }).toBuffer();
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

if (errors.length > 0) {
  console.error(`Invalid gallery images (${errors.length}):`);
  for (const e of errors) {
    console.error(`  ${e}`);
  }
  process.exit(1);
}

console.log(`OK: validated and decoded ${files.length} gallery images`);
