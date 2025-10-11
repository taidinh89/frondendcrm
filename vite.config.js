import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildPath = env.VITE_BUILD_PATH || 'dist';

  return {
    plugins: [react()],
    build: {
      outDir: `../backend/public/${buildPath}`,
      emptyOutDir: true,
      manifest: true,
    }
  };
});