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
  eleventyConfig.addPassthroughCopy({
    'src/v2/blog/blogs': 'blog/blogs',
    'src/v2/projects/wallpapersync': 'projects/wallpapersync',
  });

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget('./src/assets/');
  // Watch V2 and V3 SCSS sources
  eleventyConfig.addWatchTarget('./src/v2/scss/');
  eleventyConfig.addWatchTarget('./src/v3/scss/');

  // 3. Add Plugins
  eleventyConfig.addPlugin(syntaxHighlight);

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
      });

      const imgAttrs = {
        alt: alt || '',
        loading: loading || 'lazy',
        decoding: 'async',
        sizes: '(max-width: 768px) 100vw, 33vw',
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

      const byteSize = fs.statSync(srcPath).size;
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

      const baseName = path.basename(srcPath, path.extname(srcPath));
      const slug = `${subdir}-${baseName}`;
      const detailUrl = `/gallery/image/${slug}/`;

      const orderStyle = (order !== undefined && order !== null && order !== '') ? ` style="order: ${order};"` : '';
      return `<div class="gallery-item"${orderStyle}>
  ${pictureHtml}
  <div class="gallery-item__overlay">
    <div class="gallery-item__meta">${
      deviceStr
        ? `
      <span>${deviceStr}</span>`
        : ''
    }
      <span>${dateStr}</span>
      <span>${resolutionStr}</span>
      <span>${fileSizeStr}</span>
    </div>
    <a href="${detailUrl}" class="gallery-item__view-details">View Details</a>
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
