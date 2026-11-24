import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import Image from '@11ty/eleventy-img';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { sanitizeSlug } from './src/_data/lib/gallery-shared.js';

export default function (eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy('src/assets');

  // Copy raw v2 markdown files to their original paths so the v3 markdown viewer can fetch them
  const v2Passthrough = {
    'src/v2/blog/*.md': 'blog/',
    'src/v2/about/index.md': 'about/index.md',
    'src/v2/projects/*.md': 'projects/',
  };
  eleventyConfig.addPassthroughCopy(v2Passthrough);

  // Copy root license files so the footer links resolve in the built site
  eleventyConfig.addPassthroughCopy({
    LICENSE: 'LICENSE',
    'LICENSE-CONTENT': 'LICENSE-CONTENT',
  });

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget('./src/assets/js/');
  eleventyConfig.addWatchTarget('./src/assets/css/');
  // Watch V2 and V3 CSS sources (compiled via Tailwind CLI, not Eleventy)
  eleventyConfig.addWatchTarget('./src/v2/css/');
  eleventyConfig.addWatchTarget('./src/v3/css/');

  // 3. Add Plugins & Filters
  eleventyConfig.addPlugin(syntaxHighlight);

  // Filter to sort collection items by date descending (latest first)
  eleventyConfig.addFilter('sortByDate', function (items) {
    if (!items || !Array.isArray(items)) return [];
    return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  // Filter to format dates consistently (e.g. "Sep 8, 2026")
  eleventyConfig.addFilter('formatDate', function (dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  });

  // 4. Gallery image shortcode
  //    Usage: {% gimg "photography/1.jpg", "alt text", "eager", "high" %}
  //    - Generates WebP + JPEG variants at multiple widths
  //    - Outputs <picture> with srcset so the browser picks the right size
  //    - loading defaults to "lazy"; fetchpriority only set when passed
  const META_CACHE_PATH = './_site/assets/img/gallery/.meta-cache.json';
  let metaCache = null;
  let metaCacheDirty = false;

  function loadMetaCache() {
    if (metaCache) return metaCache;
    try {
      if (fs.existsSync(META_CACHE_PATH)) {
        metaCache = JSON.parse(fs.readFileSync(META_CACHE_PATH, 'utf8'));
        return metaCache;
      }
    } catch {
      // Ignore corrupt cache
    }
    metaCache = {};
    return metaCache;
  }

  eleventyConfig.on('eleventy.after', () => {
    if (metaCacheDirty && metaCache) {
      fs.mkdirSync(path.dirname(META_CACHE_PATH), { recursive: true });
      fs.writeFileSync(META_CACHE_PATH, JSON.stringify(metaCache));
      metaCacheDirty = false;
    }
  });

  eleventyConfig.addNunjucksAsyncShortcode(
    'gimg',
    async function (src, alt, loading, fetchpriority, order) {
      const srcPath = `./src/_gallery_source/${src}`;
      // Keep processed images in the same subdirectory (photography/, ai/, forza/)
      const subdir = src.split('/')[0];
      const baseName = sanitizeSlug(path.basename(srcPath, path.extname(srcPath)));
      const outDir = `./_site/assets/img/gallery/${subdir}/`;
      const urlPath = `/assets/img/gallery/${subdir}/`;
      const widths = [400, 800, 1200, 1800];
      const formats = ['webp', 'jpeg'];

      const stats = fs.statSync(srcPath);
      const cache = loadMetaCache();
      const cached = cache[src];
      let srcMeta;
      let deviceStr = '';

      if (cached && cached.mtimeMs === stats.mtimeMs) {
        srcMeta = { width: cached.width, height: cached.height };
        deviceStr = cached.deviceStr || '';
      } else {
        const rawMeta = await sharp(srcPath).metadata();
        srcMeta = { width: rawMeta.width, height: rawMeta.height };
        if (rawMeta.exif) {
          try {
            const exif = exifReader(rawMeta.exif);
            const make = exif.Image?.Make?.trim() ?? '';
            const model = exif.Image?.Model?.trim() ?? '';
            if (make && model) {
              deviceStr = model.toLowerCase().startsWith(make.toLowerCase())
                ? model
                : `${make} ${model}`;
            } else {
              deviceStr = model || make;
            }
          } catch {
            // No EXIF or unreadable — leave deviceStr empty
          }
        }
        cache[src] = {
          mtimeMs: stats.mtimeMs,
          width: srcMeta.width,
          height: srcMeta.height,
          deviceStr,
        };
        metaCacheDirty = true;
      }

      // Skip expensive WebP/JPEG re-encoding when all target sizes already exist and are up to date
      const targetWidths = widths.filter((w) => w <= (srcMeta.width || w));
      if (targetWidths.length === 0 && srcMeta.width) {
        targetWidths.push(srcMeta.width);
      }

      const allCached =
        targetWidths.length > 0 &&
        formats.every((fmt) =>
          targetWidths.every((w) => {
            const fPath = path.join(outDir, `${baseName}-${w}.${fmt}`);
            return fs.existsSync(fPath) && fs.statSync(fPath).mtimeMs >= stats.mtimeMs;
          }),
        );

      let metadata;
      if (allCached) {
        metadata = {};
        for (const fmt of formats) {
          metadata[fmt] = targetWidths.map((w) => {
            const h = Math.round((srcMeta.height / srcMeta.width) * w);
            const url = `${urlPath}${baseName}-${w}.${fmt}`;
            return {
              format: fmt,
              width: w,
              height: h,
              url,
              sourceType: `image/${fmt}`,
              srcset: `${url} ${w}w`,
              outputPath: path.join(outDir, `${baseName}-${w}.${fmt}`),
            };
          });
        }
      } else {
        metadata = await Image(srcPath, {
          widths,
          formats,
          outputDir: outDir,
          urlPath,
          filenameFormat: (_id, imgSrc, width, format) => {
            const name = sanitizeSlug(path.basename(imgSrc, path.extname(imgSrc)));
            return `${name}-${width}.${format}`;
          },
          sharpWebpOptions: {
            quality: 80,
          },
          sharpJpegOptions: {
            quality: 80,
          },
        });
      }

      const imgAttrs = {
        alt: alt || '',
        loading: loading || 'lazy',
        decoding: 'async',
        sizes: '(max-width: 520px) calc(100vw - 32px), (max-width: 768px) calc(50vw - 24px), 380px',
      };
      // Only forward fetchpriority when explicitly provided
      if (fetchpriority) {
        imgAttrs.fetchpriority = fetchpriority;
      }

      const pictureHtml = Image.generateHTML(metadata, imgAttrs);

      // ── Overlay metadata ────────────────────────────────────────────────
      // Date: use the source file's last-modified time
      const dateStr = stats.mtime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Resolution + size from the original source file
      const resolutionStr = `${srcMeta.width} &times; ${srcMeta.height}`;

      const byteSize = stats.size;
      const fileSizeStr =
        byteSize >= 1024 * 1024
          ? `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(byteSize / 1024)} KB`;

      const slug = `${subdir}-${baseName}`;
      const detailUrl = `/gallery/image/${slug}/`;

      const orderStyle =
        order !== undefined && order !== null && order !== ''
          ? ` style="order: ${order}; --stagger-idx: ${order};"`
          : '';
      return `<div class="gallery-item relative w-full flex flex-col overflow-hidden"${orderStyle}>
  <a href="${detailUrl}" class="gallery-item__link block w-full relative cursor-pointer text-inherit no-underline" aria-label="View details for ${baseName}">
    ${pictureHtml}
    <div class="gallery-item__overlay absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.85)] flex flex-col justify-end items-start p-[14px] gap-[10px]">
      <div class="gallery-item__meta flex flex-col gap-[3px] font-regular text-[11px] text-[#d8d8d8]">${
        deviceStr
          ? `
        <span>${deviceStr}</span>`
          : ''
      }
        <span>${dateStr}</span>
        <span>${resolutionStr}</span>
        <span>${fileSizeStr}</span>
        <span>© Tasrif · CC BY-NC 4.0</span>
      </div>
      <span class="gallery-item__view-details inline-block bg-body-text text-container-bg font-regular text-[12px] py-[6px] px-[14px] no-underline transition-colors duration-200 ease">View Details</span>
    </div>
  </a>
</div>`;
    },
  );

  // 5. Build-time 1-bit Bayer dithered thumbnail shortcode
  //    Usage: {% ditherThumb "src/assets/img/photo.jpg", "alt text", 240, 152 %}
  const BAYER_4X4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  eleventyConfig.addNunjucksAsyncShortcode(
    'ditherThumb',
    async function (srcPath, alt, width = 240, height = 152) {
      const baseName = sanitizeSlug(path.basename(srcPath, path.extname(srcPath)));
      const outDir = './_site/assets/img/dither';
      const outFile = `${baseName}-${width}x${height}.png`;
      const fullOut = path.join(outDir, outFile);
      const url = `/assets/img/dither/${outFile}`;

      fs.mkdirSync(outDir, { recursive: true });

      const srcStat = fs.statSync(srcPath);
      if (fs.existsSync(fullOut) && fs.statSync(fullOut).mtimeMs >= srcStat.mtimeMs) {
        return `<img src="${url}" alt="${alt || ''}" width="${width}" height="${height}" loading="lazy" decoding="async" class="w-full h-full object-cover block" />`;
      }

      const { data, info } = await sharp(srcPath)
        .resize(width, height, { fit: 'cover' })
        .greyscale()
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rgba = Buffer.alloc(info.width * info.height * 4);
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const i = y * info.width + x;
          const threshold = ((BAYER_4X4[y & 3][x & 3] + 0.5) / 16) * 255;
          const isLight = data[i] > threshold;
          const o = i * 4;
          if (isLight) {
            // Warm phosphor off-white
            rgba[o] = 229;
            rgba[o + 1] = 227;
            rgba[o + 2] = 220;
            rgba[o + 3] = 255;
          } else {
            // Warm terminal charcoal
            rgba[o] = 16;
            rgba[o + 1] = 17;
            rgba[o + 2] = 16;
            rgba[o + 3] = 255;
          }
        }
      }

      await sharp(rgba, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png({ palette: true, colours: 2 })
        .toFile(fullOut);

      return `<img src="${url}" alt="${alt || ''}" width="${width}" height="${height}" loading="lazy" decoding="async" class="w-full h-full object-cover block" />`;
    },
  );

  return {
    dir: {
      input: 'src', // Look for files in the src folder
      output: '_site', // Output the built site to '_site' folder
      includes: 'v2/_includes', // V2 layouts & partials (V3 uses layout: false)
    },
  };
}
