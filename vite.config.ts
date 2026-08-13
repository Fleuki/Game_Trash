import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути в сборке: игра запускается из архива, а не с корня домена.
  base: './',
  build: {
    target: 'es2022',
  },
});
