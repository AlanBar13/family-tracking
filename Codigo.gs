/**
 * Tracker de gastos familiares
 * Backend de Google Apps Script (vinculado al archivo de Sheets).
 *
 * Primer paso: ejecutar la función `instalar` una sola vez desde el editor.
 */

const HOJA_GASTOS = 'Gastos';
const HOJA_CONFIG = 'Config';

const COL = { ID: 1, NOMBRE: 2, MONTO: 3, FECHA: 4, CATEGORIA: 5, AUTOR: 6, PAGO: 7, NOTAS: 8 };

const ENCABEZADOS_GASTOS = [
  'ID', 'Nombre del gasto', 'Monto', 'Fecha', 'Categoría', 'Quién lo subió', 'Tipo de pago', 'Notas'
];
const ENCABEZADOS_CONFIG = ['Categorías', 'Tipos de pago', 'Correo', 'Nombre'];

const CATEGORIAS_INICIALES = [
  'Despensa', 'Casa', 'Servicios', 'Transporte', 'Salud',
  'Comida fuera', 'Entretenimiento', 'Ropa', 'Hijos', 'Otros'
];
const PAGOS_INICIALES = ['Transferencia', 'Crédito', 'Débito', 'Efectivo'];

/* ---------------------------------------------------------------- utilidades */

function libro_() {
  return SpreadsheetApp.getActive();
}

function zona_() {
  return libro_().getSpreadsheetTimeZone() || 'America/Mexico_City';
}

function hoja_(nombre) {
  const sh = libro_().getSheetByName(nombre);
  if (!sh) {
    throw new Error('Falta la hoja "' + nombre + '". Ejecuta la función instalar() una vez.');
  }
  return sh;
}

function aTexto_(v) {
  return String(v == null ? '' : v).trim();
}

/** 'yyyy-MM-dd' -> Date en la zona horaria del archivo */
function aFecha_(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(aTexto_(iso));
  if (!m) throw new Error('La fecha no es válida.');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/** Date -> 'yyyy-MM-dd' */
function aISO_(fecha) {
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';
  return Utilities.formatDate(fecha, zona_(), 'yyyy-MM-dd');
}

/* ------------------------------------------------------------------ instalar */

/**
 * Crea las dos hojas con encabezados, formatos, validaciones y valores de
 * ejemplo en Config. Es seguro volver a ejecutarla: no borra datos.
 */
function instalar() {
  const ss = libro_();

  let config = ss.getSheetByName(HOJA_CONFIG);
  if (!config) config = ss.insertSheet(HOJA_CONFIG);
  if (config.getLastRow() === 0) {
    config.getRange(1, 1, 1, ENCABEZADOS_CONFIG.length).setValues([ENCABEZADOS_CONFIG]);
    config.getRange(2, 1, CATEGORIAS_INICIALES.length, 1)
      .setValues(CATEGORIAS_INICIALES.map(function (c) { return [c]; }));
    config.getRange(2, 2, PAGOS_INICIALES.length, 1)
      .setValues(PAGOS_INICIALES.map(function (p) { return [p]; }));
    config.getRange(2, 3, 2, 2).setValues([
      ['persona1@gmail.com', 'Nombre 1'],
      ['persona2@gmail.com', 'Nombre 2']
    ]);
    config.getRange(1, 1, 1, ENCABEZADOS_CONFIG.length).setFontWeight('bold');
    config.setFrozenRows(1);
    config.setColumnWidths(1, 4, 190);
  }

  let gastos = ss.getSheetByName(HOJA_GASTOS);
  if (!gastos) gastos = ss.insertSheet(HOJA_GASTOS, 0);
  if (gastos.getLastRow() === 0) {
    gastos.getRange(1, 1, 1, ENCABEZADOS_GASTOS.length).setValues([ENCABEZADOS_GASTOS]);
    gastos.getRange(1, 1, 1, ENCABEZADOS_GASTOS.length).setFontWeight('bold');
    gastos.setFrozenRows(1);
    gastos.setColumnWidth(COL.ID, 240);
    gastos.setColumnWidth(COL.NOMBRE, 220);
    gastos.setColumnWidth(COL.NOTAS, 260);
  }
  gastos.getRange(2, COL.MONTO, gastos.getMaxRows() - 1, 1).setNumberFormat('$#,##0.00');
  gastos.getRange(2, COL.FECHA, gastos.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');

  // Listas desplegables por si capturan directo en la hoja.
  const reglaCat = SpreadsheetApp.newDataValidation()
    .requireValueInRange(config.getRange('Config!A2:A'), true).setAllowInvalid(false).build();
  const reglaPago = SpreadsheetApp.newDataValidation()
    .requireValueInRange(config.getRange('Config!B2:B'), true).setAllowInvalid(false).build();
  gastos.getRange(2, COL.CATEGORIA, gastos.getMaxRows() - 1, 1).setDataValidation(reglaCat);
  gastos.getRange(2, COL.PAGO, gastos.getMaxRows() - 1, 1).setDataValidation(reglaPago);

  SpreadsheetApp.getUi().alert(
    'Listo. Ahora abre la hoja Config y pon los correos de Google de cada quien en la columna C.'
  );
}

/* ---------------------------------------------------------------- app web */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gastos de la casa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ------------------------------------------------------------------ config */

function leerConfig_() {
  const sh = hoja_(HOJA_CONFIG);
  const filas = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    : [];

  const categorias = [], tiposPago = [], personas = [];
  filas.forEach(function (f) {
    if (aTexto_(f[0])) categorias.push(aTexto_(f[0]));
    if (aTexto_(f[1])) tiposPago.push(aTexto_(f[1]));
    const correo = aTexto_(f[2]).toLowerCase();
    if (correo) personas.push({ correo: correo, nombre: aTexto_(f[3]) || correo.split('@')[0] });
  });

  return { categorias: categorias, tiposPago: tiposPago, personas: personas };
}

function usuarioActual_(config) {
  const correo = aTexto_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!correo) {
    throw new Error(
      'No pude identificar tu cuenta. La app debe publicarse con la opción ' +
      '"Ejecutar como: Usuario que accede a la aplicación web".'
    );
  }
  const personas = config.personas;
  if (personas.length) {
    const encontrada = personas.filter(function (p) { return p.correo === correo; })[0];
    if (!encontrada) {
      throw new Error('La cuenta ' + correo + ' no está en la hoja Config. Agrégala en la columna Correo.');
    }
    return encontrada;
  }
  return { correo: correo, nombre: correo.split('@')[0] };
}

/* ------------------------------------------------------------------ lectura */

function leerGastos_() {
  const sh = hoja_(HOJA_GASTOS);
  if (sh.getLastRow() < 2) return [];
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, ENCABEZADOS_GASTOS.length).getValues();
  const lista = [];
  filas.forEach(function (f) {
    const id = aTexto_(f[COL.ID - 1]);
    if (!id) return;
    const fecha = f[COL.FECHA - 1] instanceof Date ? aISO_(f[COL.FECHA - 1]) : aTexto_(f[COL.FECHA - 1]);
    lista.push({
      id: id,
      nombre: aTexto_(f[COL.NOMBRE - 1]),
      monto: Number(f[COL.MONTO - 1]) || 0,
      fecha: fecha,
      categoria: aTexto_(f[COL.CATEGORIA - 1]),
      autor: aTexto_(f[COL.AUTOR - 1]).toLowerCase(),
      tipoPago: aTexto_(f[COL.PAGO - 1]),
      notas: aTexto_(f[COL.NOTAS - 1])
    });
  });
  return lista;
}

/**
 * Estado completo que consume la app web.
 * @param {string} mes 'yyyy-MM'. Si viene vacío, se usa el mes en curso.
 */
function obtenerEstado(mes) {
  const config = leerConfig_();
  const usuario = usuarioActual_(config);
  const todos = leerGastos_();

  const mesActual = Utilities.formatDate(new Date(), zona_(), 'yyyy-MM');
  const meses = {};
  todos.forEach(function (g) { if (g.fecha) meses[g.fecha.slice(0, 7)] = true; });
  meses[mesActual] = true;

  const seleccionado = /^\d{4}-\d{2}$/.test(aTexto_(mes)) ? aTexto_(mes) : mesActual;
  const delMes = todos.filter(function (g) { return g.fecha.slice(0, 7) === seleccionado; });
  delMes.sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });

  return {
    usuario: usuario,
    config: config,
    hoy: Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd'),
    mes: seleccionado,
    meses: Object.keys(meses).sort().reverse(),
    gastos: delMes
  };
}

/* ---------------------------------------------------------------- escritura */

function validar_(datos, config) {
  const nombre = aTexto_(datos.nombre);
  const monto = Number(datos.monto);
  if (!nombre) throw new Error('Ponle un nombre al gasto.');
  if (!isFinite(monto) || monto <= 0) throw new Error('El monto debe ser mayor a cero.');
  if (config.categorias.indexOf(aTexto_(datos.categoria)) === -1) {
    throw new Error('Esa categoría no existe en la hoja Config.');
  }
  if (config.tiposPago.indexOf(aTexto_(datos.tipoPago)) === -1) {
    throw new Error('Ese tipo de pago no existe en la hoja Config.');
  }
  return {
    nombre: nombre,
    monto: Math.round(monto * 100) / 100,
    fecha: aFecha_(datos.fecha),
    categoria: aTexto_(datos.categoria),
    tipoPago: aTexto_(datos.tipoPago),
    notas: aTexto_(datos.notas)
  };
}

function buscarFila_(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, COL.ID, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (aTexto_(ids[i][0]) === id) return i + 2;
  }
  return -1;
}

function agregarGasto(datos) {
  const config = leerConfig_();
  const usuario = usuarioActual_(config);
  const limpio = validar_(datos, config);

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = hoja_(HOJA_GASTOS);
    sh.appendRow([
      Utilities.getUuid(), limpio.nombre, limpio.monto, limpio.fecha,
      limpio.categoria, usuario.correo, limpio.tipoPago, limpio.notas
    ]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return obtenerEstado(aISO_(limpio.fecha).slice(0, 7));
}

function actualizarGasto(datos) {
  const config = leerConfig_();
  usuarioActual_(config);
  const limpio = validar_(datos, config);
  const id = aTexto_(datos.id);

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = hoja_(HOJA_GASTOS);
    const fila = buscarFila_(sh, id);
    if (fila === -1) throw new Error('Ese gasto ya no existe.');
    sh.getRange(fila, COL.NOMBRE).setValue(limpio.nombre);
    sh.getRange(fila, COL.MONTO).setValue(limpio.monto);
    sh.getRange(fila, COL.FECHA).setValue(limpio.fecha);
    sh.getRange(fila, COL.CATEGORIA).setValue(limpio.categoria);
    sh.getRange(fila, COL.PAGO).setValue(limpio.tipoPago);
    sh.getRange(fila, COL.NOTAS).setValue(limpio.notas);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return obtenerEstado(aISO_(limpio.fecha).slice(0, 7));
}

function borrarGasto(id, mes) {
  const config = leerConfig_();
  usuarioActual_(config);

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = hoja_(HOJA_GASTOS);
    const fila = buscarFila_(sh, aTexto_(id));
    if (fila === -1) throw new Error('Ese gasto ya no existe.');
    sh.deleteRow(fila);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return obtenerEstado(mes);
}
