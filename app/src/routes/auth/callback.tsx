import { createFileRoute } from '@tanstack/react-router'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const destino = (ruta: string) =>
          new Response(null, {
            status: 302,
            headers: { Location: new URL(ruta, url).href },
          })

        if (!code) return destino('/login?error=fallo')

        const { error } = await crearClienteServidor().auth.exchangeCodeForSession(code)
        if (error) {
          console.error('exchangeCodeForSession falló', error)
          return destino('/login?error=fallo')
        }
        return destino('/')
      },
    },
  },
})
