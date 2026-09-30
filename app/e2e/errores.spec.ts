import { expect, test } from '@playwright/test'
import { archivoSesion, clienteAdmin } from './datos'
import { llenarGasto, nombreUnico, PNG_1X1, respuestaServerFn } from './ayudas'

test.use({ storageState: archivoSesion('miembro') })

test('offline: la franja aparece y el formulario conserva los datos', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await context.setOffline(true)
  const franja = page.getByRole('status').filter({ hasText: 'Sin conexión' })
  await expect(franja).toHaveText(
    'Sin conexión. Lo que captures no se guardará hasta que vuelva el internet.',
  )
  await page.screenshot({ path: 'capturas-paso10/offline.png' })

  await page.getByRole('link', { name: 'Nuevo gasto' }).click()
  const nombre = nombreUnico('offline')
  await llenarGasto(page, nombre, '50')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('alert')).toHaveText(/^Sin conexión\./)
  await expect(page.getByRole('dialog', { name: 'Nuevo gasto' })).toBeVisible()
  await expect(page.getByLabel('Nombre del gasto')).toHaveValue(nombre)
  await expect(page.getByLabel('Monto')).toHaveValue('50')

  await context.setOffline(false)
  await expect(franja).toHaveCount(0)
})

test('error de servidor al guardar: mensaje entendible, sin perder el formulario', async ({
  page,
}) => {
  await page.goto('/?nuevo=1')
  await page.route('**/_serverFn/**', (r) =>
    r.fulfill({
      status: 500,
      contentType: 'text/plain',
      body: 'Internal Server Error: relation "gastos" does not exist',
    }),
  )
  await llenarGasto(page, nombreUnico('500'), '10')
  await page.getByRole('button', { name: 'Guardar' }).click()
  const alerta = page.getByRole('alert')
  await expect(alerta).toHaveText('Algo salió mal. Intenta de nuevo.')
  await expect(page.getByLabel('Monto')).toHaveValue('10')
})

test('error de servidor al cargar: pantalla amable con Reintentar', async ({ page }) => {
  await page.goto('/')
  await page.route('**/_serverFn/**', (r) =>
    r.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' }),
  )
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  const alerta = page.getByRole('alert')
  await expect(alerta).toContainText('Algo salió mal. Intenta de nuevo.')
  await page.screenshot({ path: 'capturas-paso10/error-generico.png' })

  await page.unroute('**/_serverFn/**')
  await alerta.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeVisible()
})

test('sesión vencida sin renovación: va a /login con el aviso', async ({
  page,
  context,
}) => {
  await page.goto('/?nuevo=1')
  await context.clearCookies()
  await llenarGasto(page, nombreUnico('sesion'), '10')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page).toHaveURL(/\/login\?error=sesion/)
  await expect(page.getByRole('alert')).toHaveText('Tu sesión expiró. Vuelve a entrar.')
})

test('ruta inexistente: 404 con enlace al inicio', async ({ page }) => {
  await page.goto('/no-existe')
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Ir al inicio' }).click()
  await expect(page).toHaveURL('/')
})

test('ticket con la respuesta de Gemini simulada llena el formulario', async ({
  page,
}) => {
  const admin = clienteAdmin()
  const { data: cat } = await admin
    .from('categorias')
    .select('id')
    .eq('activa', true)
    .order('orden')
    .limit(1)
    .single()
  const { data: tipo } = await admin
    .from('tipos_pago')
    .select('id')
    .eq('activo', true)
    .order('orden')
    .limit(1)
    .single()

  await page.goto('/?nuevo=1')
  await page.route('**/_serverFn/**', (r) => {
    if (!r.request().postData()?.includes('base64')) return r.continue()
    return r.fulfill(
      respuestaServerFn({
        nombre: 'Tienda Simulada',
        monto: 234.5,
        fecha: '2026-09-15',
        categoriaId: cat!.id,
        tipoPagoId: tipo!.id,
        aviso: 'Revisa los datos antes de guardar',
      }),
    )
  })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'ticket.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(page.getByLabel('Nombre del gasto')).toHaveValue('Tienda Simulada')
  await expect(page.getByLabel('Monto')).toHaveValue('234.5')
  await expect(page.getByLabel('Fecha')).toHaveValue('2026-09-15')
  await expect(page.getByLabel('Categoría')).toHaveValue(cat!.id)
  await expect(page.getByText('Revisa los datos antes de guardar')).toBeVisible()
})
