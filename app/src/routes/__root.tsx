import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '@/styles.css?url'
import { ActualizacionPwa } from '@/components/ActualizacionPwa'
import { FranjaOffline } from '@/components/FranjaOffline'
import { PantallaError } from '@/components/PantallaError'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { title: 'Gastos de la casa' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  // El documento va en shellComponent para que el límite de error raíz también lo tenga.
  shellComponent: RootDocument,
  component: Outlet,
  errorComponent: ({ error }) => <PantallaError error={error} recargar />,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-MX">
      <head>
        {/* Van fuera de head() porque TanStack deduplica metas con el mismo name. */}
        <meta
          name="theme-color"
          content="#eef1f0"
          media="(prefers-color-scheme: light)"
        />
        <meta name="theme-color" content="#131817" media="(prefers-color-scheme: dark)" />
        <HeadContent />
      </head>
      <body>
        {children}
        <FranjaOffline />
        <ActualizacionPwa />
        <Scripts />
      </body>
    </html>
  )
}
