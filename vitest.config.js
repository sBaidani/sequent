import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    transformMode: { web: [/\.[jt]sx?$/] },
    setupFiles: ['./vitest.setup.js'],
    deps: {
      inline: [/solid-js/],
    },
    exclude: ['node_modules', 'dist', 'tests/e2e/**', 'tests/*.spec.js', 'tests/**/*.spec.js'],
  },
});
