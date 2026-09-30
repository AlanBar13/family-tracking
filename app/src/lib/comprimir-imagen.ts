const LADO_MAX = 1280

function cargar(archivo: File): Promise<{ img: CanvasImageSource; w: number; h: number }> {
  if (typeof createImageBitmap === 'function')
    return createImageBitmap(archivo).then((b) => ({ img: b, w: b.width, h: b.height }))
  return new Promise((ok, mal) => {
    const lector = new FileReader()
    lector.onerror = () => mal(new Error('No pude leer la foto.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => mal(new Error('No pude leer la foto.'))
      img.onload = () => ok({ img, w: img.naturalWidth, h: img.naturalHeight })
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}

/** Reduce a 1280 px de lado mayor, fondo blanco, JPEG 0.72; base64 sin el prefijo `data:`. */
export async function comprimirImagen(archivo: File): Promise<string> {
  const { img, w, h } = await cargar(archivo)
  const k = Math.min(1, LADO_MAX / Math.max(w, h))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(w * k)
  lienzo.height = Math.round(h * k)
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No pude leer la foto.')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
  return lienzo.toDataURL('image/jpeg', 0.72).split(',')[1] ?? ''
}
