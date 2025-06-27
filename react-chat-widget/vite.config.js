import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'src/index.ts', // Specify the entry point
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Explicitly include dependencies
  },
});
