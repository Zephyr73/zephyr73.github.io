import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import Image from '@11ty/eleventy-img';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { sanitizeSlug } from './src/_data/lib/gallery-shared.js';
import { normalizeSkill } from './src/_data/lib/skills-shared.js';
import { generateResumePdf } from './scripts/generate-resume-pdf.js';

export default function (eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy('src/assets');

  // Copy raw site markdown files to their original paths so the desktop markdown viewer can fetch them
  const sitePassthrough = {
    'src/site/blog/*.md': 'blog/',
    'src/site/about/index.md': 'about/index.md',
    'src/site/projects/*.md': 'projects/',
  };
  eleventyConfig.addPassthroughCopy(sitePassthrough);

  // Copy root license files so the footer links resolve in the built site
  eleventyConfig.addPassthroughCopy({
    LICENSE: 'LICENSE',
    'LICENSE-CONTENT': 'LICENSE-CONTENT',
  });

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget('./src/assets/js/');
  eleventyConfig.addWatchTarget('./src/assets/css/');
  // Watch Site and Desktop CSS sources (compiled via Tailwind CLI, not Eleventy)
  eleventyConfig.addWatchTarget('./src/site/css/');
  eleventyConfig.addWatchTarget('./src/desktop/css/');

  // 3. Add Plugins, Layouts & Filters
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addLayoutAlias('base.njk', 'layouts/base.njk');
  eleventyConfig.addLayoutAlias('about.njk', 'layouts/about.njk');

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

  // Filter to normalize a skill name into its canonical slug & display object
  eleventyConfig.addFilter('skillSlug', function (raw) {
    return normalizeSkill(raw).slug;
  });

  eleventyConfig.addFilter('skillLabel', function (raw) {
    return normalizeSkill(raw).name;
  });

  // Estimate reading time (~220 wpm) for rendered HTML content
  eleventyConfig.addFilter('readingTime', function (htmlContent) {
    if (!htmlContent) return '1 min read';
    const text = String(htmlContent).replace(/<[^>]*>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 220));
    return `${mins} min read`;
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

  eleventyConfig.on('eleventy.after', async () => {
    if (metaCacheDirty && metaCache) {
      fs.mkdirSync(path.dirname(META_CACHE_PATH), { recursive: true });
      fs.writeFileSync(META_CACHE_PATH, JSON.stringify(metaCache));
      metaCacheDirty = false;
    }
    await generateResumePdf();
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
      const formats = ['webp'];

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

      const largestWidth = targetWidths[targetWidths.length - 1];
      const jpegOutPath = path.join(outDir, `${baseName}-${largestWidth}.jpeg`);
      const jpegCached =
        fs.existsSync(jpegOutPath) && fs.statSync(jpegOutPath).mtimeMs >= stats.mtimeMs;

      const allCached =
        targetWidths.length > 0 &&
        jpegCached &&
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
            quality: 82,
          },
        });

        // Generate a single high-quality JPEG at largestWidth for gallery full-resolution downloads
        if (!jpegCached) {
          fs.mkdirSync(outDir, { recursive: true });
          const srcBuf = await fs.promises.readFile(srcPath);
          await sharp(srcBuf)
            .rotate()
            .resize({ width: largestWidth, withoutEnlargement: true })
            .jpeg({ quality: 90, mozjpeg: true })
            .toFile(jpegOutPath);
        }
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
      return `<div class="gallery-item relative w-full flex flex-col overflow-hidden border border-border bg-surface transition-colors duration-150"${orderStyle}>
  <a href="${detailUrl}" class="gallery-item__link block w-full relative cursor-pointer text-inherit no-underline" aria-label="View details for ${baseName}">
    ${pictureHtml}
    <div class="gallery-item__overlay absolute inset-0 flex flex-col justify-end items-start p-[14px] gap-[10px]">
      <div class="gallery-item__meta flex flex-col gap-[3px] font-code text-[0.7rem] text-[#e5e3dc]">${
        deviceStr
          ? `
        <span class="text-accent">${deviceStr}</span>`
          : ''
      }
        <span>${dateStr}</span>
        <span>${resolutionStr} · ${fileSizeStr}</span>
        <span class="text-[#a8a59e]">© Tasrif · CC BY-NC 4.0</span>
      </div>
      <span class="gallery-item__view-details inline-flex items-center gap-1.5 bg-surface/95 text-body-text border border-border font-code text-[0.74rem] font-semibold py-[5px] px-[12px] no-underline transition-colors duration-150 ease">&gt; View Details</span>
    </div>
  </a>
</div>`;
    },
  );

  // 5. Build-time 4-level 8x8 Bayer ordered dithered thumbnail shortcode
  //    Usage: {% ditherThumb "src/assets/img/photo.jpg", "alt text", 240, 152 %}
  const BAYER_8X8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];

  // 4-stop neutral grayscale palette (tinted dynamically to --clr-accent in CSS)
  const DITHER_PALETTE = [
    [16, 17, 16],
    [72, 74, 72],
    [152, 154, 150],
    [229, 228, 224],
  ];

  eleventyConfig.addNunjucksAsyncShortcode(
    'ditherThumb',
    async function (srcPath, alt, width = 240, height = 152) {
      const baseName = sanitizeSlug(path.basename(srcPath, path.extname(srcPath)));
      const outDir = './_site/assets/img/dither';
      const outFile = `${baseName}-${width}x${height}-bayer8-v2.png`;
      const fullOut = path.join(outDir, outFile);
      const url = `/assets/img/dither/${outFile}`;
      const imgTag = `<img src="${url}" alt="${alt || ''}" width="${width}" height="${height}" loading="lazy" decoding="async" class="w-full h-full object-cover block [image-rendering:pixelated]" />`;

      fs.mkdirSync(outDir, { recursive: true });

      const srcStat = fs.statSync(srcPath);
      if (fs.existsSync(fullOut) && fs.statSync(fullOut).mtimeMs >= srcStat.mtimeMs) {
        return imgTag;
      }

      const { data, info } = await sharp(srcPath)
        .resize(width, height, { fit: 'cover' })
        .greyscale()
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const levels = DITHER_PALETTE.length;
      const rgba = Buffer.alloc(info.width * info.height * 4);
      for (let y = 0; y < info.height; y++) {
        const row = BAYER_8X8[y & 7];
        for (let x = 0; x < info.width; x++) {
          const i = y * info.width + x;
          const v = data[i] / 255;
          const t = (row[x & 7] + 0.5) / 64;
          const q = Math.min(levels - 1, Math.max(0, Math.floor(v * (levels - 1) + t)));
          const [r, g, b] = DITHER_PALETTE[q];
          const o = i * 4;
          rgba[o] = r;
          rgba[o + 1] = g;
          rgba[o + 2] = b;
          rgba[o + 3] = 255;
        }
      }

      await sharp(rgba, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png({ palette: true, colours: levels })
        .toFile(fullOut);

      return imgTag;
    },
  );

  return {
    dir: {
      input: 'src', // Look for files in the src folder
      output: '_site', // Output the built site to '_site' folder
      includes: 'site/_includes', // Basic site layouts & partials (Desktop OS uses layout: false)
    },
  };
}
