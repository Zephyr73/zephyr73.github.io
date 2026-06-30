import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';

const GALLERY_ROOT = './src/assets/img/gallery';

async function getImageDate(filePath, isPhotography) {
  try {
    if (isPhotography) {
      const meta = await sharp(filePath).metadata();
      if (meta.exif) {
        const exif = exifReader(meta.exif);
        // Look for DateTimeOriginal in Photo or Image
        const dateStr = exif.Photo?.DateTimeOriginal || exif.Image?.DateTimeOriginal;
        if (dateStr) {
          if (dateStr instanceof Date) {
            return dateStr;
          }
          if (typeof dateStr === 'string') {
            // EXIF dates format is usually "YYYY:MM:DD HH:MM:SS"
            const parts = dateStr.match(/(\d+):(\d+):(\d+)\s+(\d+):(\d+):(\d+)/);
            if (parts) {
              // parts[2] is 1-indexed month, so subtract 1 for JS Date
              return new Date(
                parseInt(parts[1], 10),
                parseInt(parts[2], 10) - 1,
                parseInt(parts[3], 10),
                parseInt(parts[4], 10),
                parseInt(parts[5], 10),
                parseInt(parts[6], 10)
              );
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Warning parsing EXIF for ${filePath}:`, e);
  }

  // Fallback to file mtime (modified time)
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch {
    return new Date(0);
  }
}

export default async function () {
  const categories = ['photography', 'ai', 'forza'];
  const result = {};

  for (const category of categories) {
    const dirPath = path.join(GALLERY_ROOT, category);
    if (!fs.existsSync(dirPath)) {
      result[category] = [];
      continue;
    }

    const files = fs.readdirSync(dirPath);
    const images = [];

    for (const file of files) {
      if (file.startsWith('.')) continue;
      const ext = path.extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

      const filePath = path.join(dirPath, file);
      const date = await getImageDate(filePath, category === 'photography');
      const name = path.basename(file, ext);

      // Create a user-friendly alt text (matches sort.py's behaviour)
      const alt = `image ${name}`;

      images.push({
        src: `${category}/${file}`,
        alt,
        date,
      });
    }

    // Sort descending: newest first
    images.sort((a, b) => b.date.getTime() - a.date.getTime());
    result[category] = images;
  }

  return result;
}
