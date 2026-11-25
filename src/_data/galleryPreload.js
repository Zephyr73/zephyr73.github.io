/**
 * galleryPreload.js — Eleventy global data file
 * Derives a small preload manifest of gallery thumbnail URLs from the
 * already-sorted `gallery` data, used by script.js to warm the HTTP cache
 * (rel=prefetch as=image) when hovering gallery links.
 */
import path from 'node:path';
import gallery from './gallery.js';
import { sanitizeSlug } from './lib/gallery-shared.js';

export default async function () {
  const data = await gallery();
  const urls = [];

  for (const img of (data.photography || []).slice(0, 6)) {
    const baseName = sanitizeSlug(path.basename(img.src, path.extname(img.src)));
    urls.push(`/assets/img/gallery/photography/${baseName}-800.webp`);
  }

  return urls;
}
