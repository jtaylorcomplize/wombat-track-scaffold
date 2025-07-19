import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: './wombat-track',  // 👈 This line is the key
  plugins: [react()],
});
