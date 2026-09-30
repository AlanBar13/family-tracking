import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { archivoSesion } from './datos'

async function sinViolacionesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const graves = violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([])
}

test('login', async ({ page }) => {
  await page.goto('/login')
  await sinViolacionesGraves(page)
})

test.describe('con sesión', () => {
  test.use({ storageState: archivoSesion('admin') })

  test('resumen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Mes siguiente' }).waitFor()
    await sinViolacionesGraves(page)
  })
  test('lista', async ({ page }) => {
    await page.goto('/?vista=lista')
    await page.getByRole('button', { name: 'Mes siguiente' }).waitFor()
    await sinViolacionesGraves(page)
  })
  test('formulario', async ({ page }) => {
    await page.goto('/?nuevo=1')
    await page.getByRole('dialog', { name: 'Nuevo gasto' }).waitFor()
    await sinViolacionesGraves(page)
  })
  test('ajustes', async ({ page }) => {
    await page.goto('/ajustes')
    await page.getByRole('heading', { name: 'Ajustes' }).waitFor()
    await sinViolacionesGraves(page)
  })
})
