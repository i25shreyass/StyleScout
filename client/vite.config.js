import { defineConfig } from 'vite';

// In development, the page calls /api/... on its own address (localhost:5173)
// and Vite forwards those calls to the Express server on port 5001.
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
