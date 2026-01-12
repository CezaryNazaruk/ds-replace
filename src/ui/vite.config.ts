import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, '../../dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'ui.js',
        assetFileNames: 'ui.[ext]'
      }
    }
  }
});
