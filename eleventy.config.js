import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import Image from '@11ty/eleventy-img';
import path from 'node:path';

export default function (eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy('src/assets');

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget('./src/assets/');

  // 3. Add Plugins
  eleventyConfig.addPlugin(syntaxHighlight);

  // 4. Gallery image shortcode
  //    Usage: {% gimg "photography/1.jpg", "alt text", "eager", "high" %}
  //    - Generates WebP + JPEG variants at multiple widths
  //    - Outputs <picture> with srcset so the browser picks the right size
  //    - loading defaults to "lazy"; fetchpriority only set when passed
  eleventyConfig.addNunjucksAsyncShortcode('gimg', async function (src, alt, loading, fetchpriority) {
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

    return Image.generateHTML(metadata, imgAttrs);
  });

  return {
    dir: {
      input: 'src', // Look for files in the src folder
      output: '_site', // Output the built site to '_site' folder
      includes: '_includes', // Where we will keep your HTML layouts (relative to input)
    },
  };
}
