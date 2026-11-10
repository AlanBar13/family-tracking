import { ErrorApp } from '@/lib/errores'

type MensajesGemini = {
  saturado: string
  llave: string
  ilegible: string
  generico: string
}

/** Llama a Gemini y devuelve el JSON de `candidates[0].content.parts[0].text`. Errores → ErrorApp EXTERNO. */
export async function llamarGemini(
  cuerpo: unknown,
  o: { llave: string; modelo: string; mensajes: MensajesGemini },
): Promise<Record<string, unknown>> {
  const { mensajes } = o
  let r: Response
  try {
    r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.modelo)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': o.llave },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(45_000),
      },
    )
  } catch (e) {
    console.error('Gemini: fallo de red o timeout', e)
    throw new ErrorApp('EXTERNO', mensajes.generico)
  }

  const texto = await r.text()
  if (!r.ok) {
    let detalle = texto.slice(0, 200)
    try {
      detalle = JSON.parse(texto).error.message
    } catch {
      /* se queda el texto recortado */
    }
    console.error('Gemini respondió', r.status, detalle)
    if (r.status === 429) throw new ErrorApp('EXTERNO', mensajes.saturado)
    if (r.status === 400 && /API key/i.test(detalle))
      throw new ErrorApp('EXTERNO', mensajes.llave)
    throw new ErrorApp('EXTERNO', mensajes.generico)
  }

  try {
    const crudo = JSON.parse(JSON.parse(texto).candidates[0].content.parts[0].text)
    if (crudo === null || typeof crudo !== 'object') throw new Error('no es objeto')
    return crudo
  } catch (e) {
    console.error('Gemini: respuesta ilegible', e)
    throw new ErrorApp('EXTERNO', mensajes.ilegible)
  }
}
