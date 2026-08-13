import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // The repo already had vitest, @testing-library and src/setupTests.js, but
  // no config to tie them together — so tests ran in the node environment
  // with no DOM and the jest-dom matchers were never registered.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
