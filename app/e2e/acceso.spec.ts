import { expect, test } from '@playwright/test'
import { archivoSesion, USUARIOS } from './datos'

test('sin sesión: / lleva al login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible()
})

test.describe('miembro', () => {
  test.use({ storageState: archivoSesion('miembro') })
  test('con sesión: login → resumen', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: `Capturando como ${USUARIOS.miembro.nombre}` }),
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Resumen' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

test.describe('no miembro', () => {
  test.use({ storageState: archivoSesion('ajeno') })
  test('ve el mensaje de que no tiene acceso', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/error=no_autorizado/)
    await expect(page.getByRole('alert')).toContainText(
      `La cuenta ${USUARIOS.ajeno.correo} no tiene acceso`,
    )
  })
})
