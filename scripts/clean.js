import fs from 'node:fs';
import path from 'node:path';

const fullClean = process.argv.includes('--all');

try {
  if (fullClean || !fs.existsSync('_site')) {
    fs.rmSync('_site', { recursive: true, force: true });
  } else {
    // Preserve cached processed gallery/dither images across builds for fast incremental rebuilds
    for (const entry of fs.readdirSync('_site')) {
      const fullPath = path.join('_site', entry);
      if (entry === 'assets') {
        if (fs.existsSync(fullPath)) {
          for (const assetEntry of fs.readdirSync(fullPath)) {
            const assetPath = path.join(fullPath, assetEntry);
            if (assetEntry === 'img') {
              for (const imgEntry of fs.readdirSync(assetPath)) {
                if (imgEntry !== 'gallery' && imgEntry !== 'dither') {
                  fs.rmSync(path.join(assetPath, imgEntry), { recursive: true, force: true });
                }
              }
            } else {
              fs.rmSync(assetPath, { recursive: true, force: true });
            }
          }
        }
      } else {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
} catch (error) {
  console.error('Error cleaning _site:', error);
}
