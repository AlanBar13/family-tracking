/**
 * Lector de tickets con la API de Gemini.
 * Archivo aparte del principal; comparte el ámbito global con Codigo.gs.
 *
 * Requiere una propiedad de script llamada GEMINI_API_KEY.
 * Opcional: GEMINI_MODELO para cambiar de modelo sin tocar el código.
 */

const MODELO_PREDETERMINADO = 'gemini-3.5-flash-lite';
const MAX_BYTES_FOTO = 4 * 1024 * 1024;

function llaveGemini_() {
  const llave = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!llave) {
    throw new Error(
      'Falta la clave de Gemini. Agrégala en Configuración del proyecto → ' +
      'Propiedades de la secuencia de comandos, con el nombre GEMINI_API_KEY.'
    );
  }
  return llave;
}

function modeloGemini_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_MODELO') || MODELO_PREDETERMINADO;
}

function instruccion_(config) {
  const hoy = Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd');
  return [
    'Eres un lector de tickets de compra mexicanos. Analiza la foto y extrae los datos del gasto.',
    '',
    'Reglas:',
    '- total: el TOTAL realmente pagado, ya con IVA y propina incluidos. No el subtotal.',
    '  Si el ticket viene en otra moneda, conviértelo a pesos no; deja el número tal cual y anótalo en nota.',
    '- comercio: nombre corto y legible del negocio (máximo 40 caracteres). Si no aparece, describe la compra.',
    '- fecha: la fecha impresa en el ticket, en formato yyyy-MM-dd. Si no es legible, usa ' + hoy + '.',
    '- categoria: elige exactamente una de esta lista: ' + config.categorias.join(', ') + '.',
    '- tipoPago: elige exactamente uno de esta lista: ' + config.tiposPago.join(', ') + '.',
    '  Busca pistas como TARJETA, TDC, TDD, VISA, MASTERCARD, EFECTIVO, CAMBIO, SPEI, TRANSFERENCIA.',
    '  Si el ticket dice CAMBIO o EFECTIVO, es efectivo. Si no hay ninguna pista, usa ' + (config.tiposPago[0] || 'Efectivo') + '.',
    '- confianza: "alta" si leíste el total con claridad, "media" si dudaste, "baja" si la foto casi no se lee.',
    '- nota: una frase corta solo si hay algo que el usuario deba revisar (propina, pagos mixtos, foto borrosa). Si no, cadena vacía.',
    '',
    'La fecha de hoy es ' + hoy + '. Responde únicamente con el JSON pedido.'
  ].join('\n');
}

const ESQUEMA_TICKET = {
  type: 'OBJECT',
  properties: {
    comercio: { type: 'STRING' },
    total: { type: 'NUMBER' },
    fecha: { type: 'STRING' },
    categoria: { type: 'STRING' },
    tipoPago: { type: 'STRING' },
    confianza: { type: 'STRING' },
    nota: { type: 'STRING' }
  },
  required: ['comercio', 'total', 'fecha', 'categoria', 'tipoPago', 'confianza']
};

/** Empata un texto contra una lista sin importar acentos ni mayúsculas. */
function empatar_(valor, lista, respaldo) {
  const norm = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };
  const objetivo = norm(valor);
  for (let i = 0; i < lista.length; i++) {
    if (norm(lista[i]) === objetivo) return lista[i];
  }
  for (let i = 0; i < lista.length; i++) {
    if (objetivo && norm(lista[i]).indexOf(objetivo) !== -1) return lista[i];
  }
  return respaldo;
}

/**
 * Recibe la foto del ticket en base64 (JPEG, ya comprimida en el celular)
 * y devuelve los campos sugeridos para el formulario. No escribe nada.
 */
function leerTicket(base64) {
  const config = leerConfig_();
  usuarioActual_(config);

  const datos = aTexto_(base64);
  if (!datos) throw new Error('No llegó la foto.');
  if (datos.length * 0.75 > MAX_BYTES_FOTO) {
    throw new Error('La foto pesa demasiado. Intenta de nuevo con menos acercamiento.');
  }

  const cuerpo = {
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: datos } },
        { text: 'Extrae los datos de este ticket.' }
      ]
    }],
    systemInstruction: { parts: [{ text: instruccion_(config) }] },
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA_TICKET
    }
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(modeloGemini_()) + ':generateContent';

  const respuesta = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': llaveGemini_() },
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true
  });

  const codigo = respuesta.getResponseCode();
  const texto = respuesta.getContentText();
  if (codigo !== 200) {
    let detalle = '';
    try { detalle = JSON.parse(texto).error.message; } catch (e) { detalle = texto.slice(0, 200); }
    if (codigo === 429) throw new Error('Gemini está saturado o se acabó la cuota. Intenta en un minuto.');
    if (codigo === 400 && /API key/i.test(detalle)) throw new Error('La clave GEMINI_API_KEY no es válida.');
    throw new Error('Gemini respondió ' + codigo + ': ' + detalle);
  }

  let crudo;
  try {
    const json = JSON.parse(texto);
    crudo = JSON.parse(json.candidates[0].content.parts[0].text);
  } catch (e) {
    throw new Error('No pude interpretar la respuesta del modelo. Captura el gasto a mano.');
  }

  const monto = Math.round((Number(crudo.total) || 0) * 100) / 100;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(aTexto_(crudo.fecha))
    ? aTexto_(crudo.fecha)
    : Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd');

  let aviso = aTexto_(crudo.nota);
  if (!monto) aviso = 'No pude leer el total. Escríbelo a mano.';
  else if (aTexto_(crudo.confianza).toLowerCase() === 'baja') aviso = 'La foto se lee mal, revisa bien los datos.';
  if (!aviso) aviso = 'Revisa los datos antes de guardar';

  return {
    nombre: aTexto_(crudo.comercio).slice(0, 60),
    monto: monto,
    fecha: fecha,
    categoria: empatar_(crudo.categoria, config.categorias, config.categorias[0] || ''),
    tipoPago: empatar_(crudo.tipoPago, config.tiposPago, config.tiposPago[0] || ''),
    aviso: aviso
  };
}

/** Prueba rápida desde el editor: confirma que la clave existe y el modelo responde. */
function probarGemini() {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(modeloGemini_()) + ':generateContent';
  const r = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': llaveGemini_() },
    payload: JSON.stringify({ contents: [{ parts: [{ text: 'Responde solo: ok' }] }] }),
    muteHttpExceptions: true
  });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}
