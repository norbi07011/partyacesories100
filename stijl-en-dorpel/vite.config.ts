import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_PREVIEW=1 builds a single-bundle, relative-path version for sandboxed previews.
const preview = !!process.env.VITE_PREVIEW;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: preview ? './' : '/',
  build: preview
    ? {
        outDir: process.env.PREVIEW_OUT || 'dist-preview',
        emptyOutDir: true,
        rollupOptions: {
          output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app[extname]' },
        },
      }
    : {},
});
