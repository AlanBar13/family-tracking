import { expect, test } from '@playwright/test'
import { archivoSesion } from './datos'

test.describe('miembro sin permisos de admin', () => {
  test.use({ storageState: archivoSesion('miembro') })
  test('ve Ajustes pero no puede editar', async ({ page }) => {
    await page.goto('/ajustes')
    await expect(
      page.getByText('Solo un administrador puede cambiar esto.'),
    ).toBeVisible()
    await expect(page.getByLabel('Agregar a Categorías')).toBeDisabled()
    await expect(page.getByLabel('Correo del miembro nuevo')).toBeDisabled()
  })
})

test.describe('admin', () => {
  test.use({ storageState: archivoSesion('admin') })
  test('puede editar', async ({ page }) => {
    await page.goto('/ajustes')
    await expect(page.getByText('Solo un administrador puede cambiar esto.')).toHaveCount(
      0,
    )
    await expect(page.getByLabel('Agregar a Categorías')).toBeEnabled()
  })
})
