/**
 * galleryPreload.js — Eleventy global data file
 * Derives a small preload manifest of gallery thumbnail URLs from the
 * already-sorted `gallery` data, used by script.js to warm the HTTP cache
 * (rel=prefetch as=image) when hovering gallery links.
 */
import path from 'node:path';
import gallery from './gallery.js';

export default async function () {
  const data = await gallery();
  const LIMITS = { photography: 12, ai: 6, forza: 6 };
  const urls = [];

  for (const category of ['photography', 'ai', 'forza']) {
    const items = data[category] || [];
    for (const img of items.slice(0, LIMITS[category])) {
      const name = path.basename(img.src, path.extname(img.src));
      urls.push(`/assets/img/gallery/${category}/${name}-800w.webp`);
    }
  }

  return urls;
}
