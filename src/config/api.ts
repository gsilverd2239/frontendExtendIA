// Configuración de la URL Base del Backend para ExtendIA
// Si VITE_API_BASE_URL está definido en el archivo .env (p. ej. VITE_API_BASE_URL=http://localhost:5510), se usará esa URL.
// De lo contrario, usará rutas relativas '/api' para aprovechar el proxy de Vite o el Reverse Proxy de IIS/Cloudflare.

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
