# Zephyr73 Portfolio

Personal portfolio website built with Eleventy (11ty), showcasing projects, photography, and blog posts.

[**View Live Site**](https://zephyr73.github.io)

## Features

- **Blog:** Technical and personal articles using Markdown.
- **Gallery:** Categorized image galleries for AI art, photography, and game captures.
- **Projects:** Showcasing various software and web projects.
- **SCSS Workflow:** Modular styles with custom mixins and variables.
- **Automated Deployment:** CI/CD pipeline using GitHub Actions.

## Tech Stack

- **SSG:** [Eleventy (11ty)](https://www.11ty.dev/)
- **Templating:** [Nunjucks](https://mozilla.github.io/nunjucks/)
- **CSS Preprocessor:** [Sass (SCSS)](https://sass-lang.com/)
- **Linting & Formatting:** ESLint & Prettier
- **Deployment:** GitHub Pages & Actions

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Zephyr73/zephyr73.github.io.git
   cd zephyr73.github.io
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server with live reload and SCSS watching:
```bash
npm run dev
```
The site will be available at `http://localhost:8080`.

### Build

Generate the static site into the `_site/` directory:
```bash
npm run build
```

## Project Structure

- `src/`: Source files for the website.
  - `_includes/`: Shared layouts and components (Nunjucks).
  - `assets/`: Static assets (JS, CSS, images).
  - `blog/`: Markdown files for blog posts.
  - `scss/`: Modular Sass files.
- `docs/`: Additional project documentation.
- `.github/workflows/`: CI/CD configuration for GitHub Pages.

## License

The code in this project is licensed under the [ISC](LICENSE-CODE) license.

The original photography and AI artwork are licensed under [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/) (CC BY-NC 4.0). This means you are free to share and adapt the work for non-commercial purposes, provided you give appropriate credit.
