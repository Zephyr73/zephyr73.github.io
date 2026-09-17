import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';

const GALLERY_ROOT = './src/_gallery_source';

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
                parseInt(parts[6], 10),
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

let cachedGalleryResult = null;

export default async function () {
  if (cachedGalleryResult) {
    return cachedGalleryResult;
  }

  const categories = ['photography', 'ai', 'forza'];
  const result = {};

  for (const category of categories) {
    const dirPath = path.join(GALLERY_ROOT, category);
    if (!fs.existsSync(dirPath)) {
      result[category] = [];
      continue;
    }

    const files = fs.readdirSync(dirPath);
    const validFiles = files.filter((file) => {
      if (file.startsWith('.')) return false;
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    const imagePromises = validFiles.map(async (file) => {
      const ext = path.extname(file).toLowerCase();
      const filePath = path.join(dirPath, file);
      const date = await getImageDate(filePath, category === 'photography');
      const name = path.basename(file, ext);

      return {
        src: `${category}/${file}`,
        alt: `image ${name}`,
        date,
      };
    });

    const images = await Promise.all(imagePromises);

    // Sort descending: newest first
    images.sort((a, b) => b.date.getTime() - a.date.getTime());
    result[category] = images;
  }

  cachedGalleryResult = result;
  return result;
}
