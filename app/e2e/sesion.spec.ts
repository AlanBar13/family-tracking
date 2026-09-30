import { expect, test } from '@playwright/test'
import { cookiesDeSesion, USUARIOS } from './datos'

type Cookie = Awaited<ReturnType<typeof cookiesDeSesion>>[number]

/** Junta los trozos `sb-…-auth-token(.N)` y devuelve la sesión que guarda @supabase/ssr. */
function leerSesion(cookies: { name: string; value: string }[]) {
  const trozos = cookies
    .filter((c) => c.name.startsWith('sb-'))
    .sort((a, b) => a.name.localeCompare(b.name))
  const valor = trozos.map((c) => c.value).join('')
  const sesion = JSON.parse(
    Buffer.from(valor.replace('base64-', ''), 'base64url').toString(),
  )
  return { base: trozos[0]!.name.replace(/\.\d+$/, ''), sesion }
}

test('token vencido con refresh token válido: la petición sigue y la sesión se renueva', async ({
  page,
  context,
}) => {
  const cookies = await cookiesDeSesion(USUARIOS.miembro.correo)
  const { base, sesion } = leerSesion(cookies)
  const accesoOriginal = sesion.access_token as string

  // El access token "venció" hace una hora; el refresh token sigue intacto.
  sesion.expires_at = Math.floor(Date.now() / 1000) - 3600
  const vencida: Cookie = {
    ...cookies[0]!,
    name: base,
    value: `base64-${Buffer.from(JSON.stringify(sesion)).toString('base64url')}`,
  }
  await context.addCookies([vencida])

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: `Capturando como ${USUARIOS.miembro.nombre}` }),
  ).toBeVisible()

  const renovada = leerSesion(await context.cookies()).sesion
  expect(renovada.access_token).not.toBe(accesoOriginal)
  expect(renovada.expires_at).toBeGreaterThan(Date.now() / 1000)
})
