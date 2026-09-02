// @ts-check
import { defineConfig } from 'astro/config';

// Deploy target: GitHub Pages with the custom domain in public/CNAME.
// Clean URLs: every page builds to <route>/index.html and links use a
// trailing slash, which GitHub Pages serves without redirects.
export default defineConfig({
  site: 'https://www.medengineers.org',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  compressHTML: true,
});
