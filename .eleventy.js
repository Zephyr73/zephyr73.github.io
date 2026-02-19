module.exports = function(eleventyConfig) {
  // 1. Copy the 'assets' folder exactly as is to the output
  eleventyConfig.addPassthroughCopy("assets");

  // 2. Watch for changes in CSS/JS so the browser reloads automatically
  eleventyConfig.addWatchTarget("./assets/");

  return {
    dir: {
      input: ".",        // Look for files in the root
      output: "_site",   // Output the built site to '_site' folder
      includes: "_includes" // Where we will keep your HTML layouts
    }
  };
};