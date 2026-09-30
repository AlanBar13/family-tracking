import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// 'unsafe-inline' en script-src: TanStack Start inyecta scripts en línea para la
// hidratación. ponytail: pasar a nonces si se quiere una CSP estricta.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const noCache = { 'cache-control': 'no-cache' }

export default defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart(),
    // Las cabeceras viven aquí (y no en vercel.json) para que también apliquen en `pnpm start`.
    nitro({
      routeRules: {
        '/**': {
          headers: {
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'permissions-policy': 'camera=(self)',
            'content-security-policy': csp,
          },
        },
        '/sw.js': { headers: noCache },
        '/manifest.webmanifest': { headers: noCache },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
})
