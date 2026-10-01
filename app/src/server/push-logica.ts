import webpush from 'web-push'
import type { Contexto } from './miembro'

/** Manda la notificación a todos los dispositivos suscritos. Nunca lanza. */
export async function avisarATodos(
  ctx: Contexto,
  aviso: { title: string; body: string; tag: string },
) {
  const publica = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  if (!publica || !privada) return
  try {
    const { data, error } = await ctx.supabase
      .from('suscripciones_push')
      .select('endpoint, p256dh, auth')
    if (error) throw error
    const opciones = {
      vapidDetails: {
        subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        publicKey: publica,
        privateKey: privada,
      },
      TTL: 60 * 60 * 24,
    }
    const resultados = await Promise.allSettled(
      data.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          opciones,
        ),
      ),
    )
    // 404/410: el navegador ya no tiene esa suscripción.
    const caducadas = data.filter((_, i) => {
      const r = resultados[i]!
      if (r.status === 'fulfilled') return false
      const codigo = (r.reason as { statusCode?: number }).statusCode
      if (codigo !== 404 && codigo !== 410) console.error('push falló', r.reason)
      return codigo === 404 || codigo === 410
    })
    if (caducadas.length)
      await ctx.supabase
        .from('suscripciones_push')
        .delete()
        .in(
          'endpoint',
          caducadas.map((s) => s.endpoint),
        )
  } catch (e) {
    console.error('avisarATodos falló', e)
  }
}
