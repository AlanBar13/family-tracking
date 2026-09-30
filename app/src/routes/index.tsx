import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Inicio,
})

function Inicio() {
  return (
    <section className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <p className="text-sm text-suave">Total del mes</p>
      <p className="mt-1 text-3xl font-semibold">—</p>
    </section>
  )
}
