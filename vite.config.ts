import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const frontendPort = parseInt(process.env.FRONTEND_PORT || process.env.VITE_PORT || '4410', 10);
  const backendPort = parseInt(process.env.BACKEND_PORT || '5510', 10);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn(`[Vite Proxy] No se pudo conectar con el backend en http://127.0.0.1:${backendPort}. Error: ${err.message}. Asegúrese de ejecutar el servidor backend (npm run dev o npm run dev:backend).`);
              if (res && !res.headersSent && 'writeHead' in res) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend Server Unavailable', message: `Verifique que el backend de Express esté ejecutándose en http://127.0.0.1:${backendPort}.` }));
              }
            });
          },
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
