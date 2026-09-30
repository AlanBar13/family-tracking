import { expect, test } from '@playwright/test'
import { archivoSesion } from './datos'
import { llenarGasto, nombreUnico } from './ayudas'

test.use({ storageState: archivoSesion('miembro') })

test('crear, editar y borrar un gasto', async ({ page }) => {
  const nombre = nombreUnico('crear')
  const editado = `${nombre} editado`
  await page.goto('/?vista=lista')

  await page.getByRole('link', { name: 'Nuevo gasto' }).click()
  const panel = page.getByRole('dialog', { name: 'Nuevo gasto' })
  await llenarGasto(page, nombre, '123.45')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: new RegExp(nombre) })).toContainText(
    '$123.45',
  )

  await page.getByRole('button', { name: new RegExp(nombre) }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar gasto' })
  await edicion.getByLabel('Nombre del gasto').fill(editado)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion).toBeHidden()
  await expect(page.getByRole('button', { name: new RegExp(editado) })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(editado) }).click()
  await page.getByRole('button', { name: 'Borrar este gasto' }).click()
  await expect(
    page.getByText(`¿Borrar "${editado}"? No se puede deshacer.`),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Borrar', exact: true }).click()
  await expect(page.getByRole('button', { name: new RegExp(editado) })).toHaveCount(0)
})

test('validación: monto en cero muestra el mensaje junto al formulario', async ({
  page,
}) => {
  await page.goto('/?nuevo=1')
  await llenarGasto(page, nombreUnico('invalido'), '0')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('alert')).toHaveText('El monto debe ser mayor a cero.')
})

test('navegar de mes, sin poder ir al futuro', async ({ page }) => {
  await page.goto('/')
  const siguiente = page.getByRole('button', { name: 'Mes siguiente' })
  await expect(siguiente).toBeDisabled()

  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page).toHaveURL(/mes=\d{4}-\d{2}/)
  await expect(siguiente).toBeEnabled()

  await siguiente.click()
  await expect(siguiente).toBeDisabled()
})
