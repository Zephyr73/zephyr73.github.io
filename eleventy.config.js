import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import Image from '@11ty/eleventy-img';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import exifReader from 'exif-reader';

export default function (eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy('src/assets');

  // Copy raw v2 markdown files to their original paths so the v3 markdown viewer can fetch them
  const projectsDir = './src/v2/projects';
  const projectSlugs = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);

  const v2Passthrough = {
    'src/v2/blog/blogs': 'blog/blogs',
    'src/v2/about/index.md': 'about/index.md',
  };
  for (const slug of projectSlugs) {
    v2Passthrough[`src/v2/projects/${slug}`] = `projects/${slug}`;
  }
  eleventyConfig.addPassthroughCopy(v2Passthrough);

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
  eleventyConfig.addNunjucksAsyncShortcode(
    'gimg',
    async function (src, alt, loading, fetchpriority, order) {
      const srcPath = `./src/assets/img/gallery/${src}`;
      // Keep processed images in the same subdirectory (photography/, ai/, forza/)
      const subdir = src.split('/')[0];

      const metadata = await Image(srcPath, {
        widths: [400, 800, 1200, 1800],
        formats: ['webp', 'jpeg'],
        outputDir: `./_site/assets/img/gallery/${subdir}/`,
        urlPath: `/assets/img/gallery/${subdir}/`,
        filenameFormat: (_id, imgSrc, width, format) => {
          const name = path.basename(imgSrc, path.extname(imgSrc));
          return `${name}-${width}w.${format}`;
        },
        sharpWebpOptions: {
          quality: 80,
        },
        sharpJpegOptions: {
          quality: 80,
        },
      });

      const baseName = path.basename(srcPath, path.extname(srcPath));

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
      const stats = fs.statSync(srcPath);
      const dateStr = stats.mtime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Resolution + size from the original source file
      const srcMeta = await sharp(srcPath).metadata();
      const resolutionStr = `${srcMeta.width} &times; ${srcMeta.height}`;

      const byteSize = stats.size;
      const fileSizeStr =
        byteSize >= 1024 * 1024
          ? `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(byteSize / 1024)} KB`;

      // Device name from EXIF Make + Model (graceful fallback)
      let deviceStr = '';
      if (srcMeta.exif) {
        try {
          const exif = exifReader(srcMeta.exif);
          const make = exif.Image?.Make?.trim() ?? '';
          const model = exif.Image?.Model?.trim() ?? '';
          // Avoid duplicating brand name when model already includes it (e.g. "Google Pixel 8")
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

      const slug = `${subdir}-${baseName}`;
      const detailUrl = `/gallery/image/${slug}/`;

      const orderStyle =
        order !== undefined && order !== null && order !== '' ? ` style="order: ${order};"` : '';
      return `<div class="gallery-item relative w-full flex flex-col overflow-hidden [&:hover_img]:shadow-[0_0_20px_2px_rgba(0,0,0,0.2)] [&:hover_img]:transition-[0.4s_ease] [&:hover_img]:outline [&:hover_img]:outline-1 [&:hover_img]:outline-body-text [&:hover_img]:scale-[1.015] [&:hover_img]:translate-z-0 [&:hover_.gallery-item\\_\\_overlay]:opacity-100 [&:hover_.gallery-item\\_\\_overlay]:pointer-events-auto"${orderStyle}>
  ${pictureHtml}
  <div class="gallery-item__overlay absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.85)] flex flex-col justify-end items-start p-[14px] gap-[10px] opacity-0 transition-opacity duration-300 ease pointer-events-none">
    <div class="gallery-item__meta flex flex-col gap-[3px] font-regular text-[11px] text-[#d8d8d8]">${
      deviceStr
        ? `
      <span>${deviceStr}</span>`
        : ''
    }
      <span>${dateStr}</span>
      <span>${resolutionStr}</span>
      <span>${fileSizeStr}</span>
    </div>
    <a href="${detailUrl}" class="gallery-item__view-details inline-block bg-body-text text-container-bg font-regular text-[12px] py-[6px] px-[14px] no-underline cursor-pointer transition-colors duration-200 ease hover:bg-container-bg hover:text-body-text hover:outline hover:outline-1 hover:outline-body-text">View Details</a>
  </div>
</div>`;
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
