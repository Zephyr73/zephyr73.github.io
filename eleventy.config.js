import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';

export default function (eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy('src/assets');

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget('./src/assets/');

  // 3. Add Plugins
  eleventyConfig.addPlugin(syntaxHighlight);

  return {
    dir: {
      input: 'src', // Look for files in the src folder
      output: '_site', // Output the built site to '_site' folder
      includes: '_includes', // Where we will keep your HTML layouts (relative to input)
    },
  };
}
