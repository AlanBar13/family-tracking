# Lector de tickets con la cámara (opcional)

Agrega un botón **Escanear ticket** al formulario: tomas la foto, se llena el
monto, el nombre, la fecha, la categoría y el tipo de pago, y tú confirmas
antes de guardar. Usa la API de Gemini de Google.

## 1. Consigue una clave de Gemini

1. Entra a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   con tu cuenta de Google y genera una clave. Tiene capa gratuita; para el
   gasto de una casa no deberías pagar nada.
2. En el editor de Apps Script: el ícono de engrane **Configuración del
   proyecto → Propiedades de la secuencia de comandos → Agregar propiedad**:
   - `GEMINI_API_KEY` = tu clave
   - (opcional) `GEMINI_MODELO` = el identificador de otro modelo, si algún
     día quieres cambiarlo sin tocar código

## 2. Agrega el archivo

Si seguiste `INSTALACION.md`, ya lo tienes. Si no: **+ → Script**, nómbralo
`Ticket` y pega el contenido de [`Ticket.gs`](./Ticket.gs).

## 3. Pruébalo

Con `Ticket` abierto, elige la función `probarGemini` en el menú desplegable
de arriba y da clic en **Ejecutar**. En **Ver → Registros** debe aparecer
`200`. Si sale un error, revisa que la clave se haya guardado bien.

## Cómo funciona

La foto se reduce a 1280 px y se comprime a JPEG dentro del navegador (queda
en 150–300 KB) antes de mandarse, así que no pesa ni tarda. El modelo regresa
el total ya con impuestos y propina (no el subtotal), intenta reconocer el
tipo de pago por palabras como TARJETA, EFECTIVO o TRANSFERENCIA, y elige la
categoría más parecida de las que tengas en la hoja Config. La foto nunca se
guarda; solo se usa para llenar el formulario.

El modelo por omisión es `gemini-3.5-flash-lite`. Google cambia su catálogo de
modelos seguido — la lista vigente siempre está en
[ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) —
por eso el nombre vive en una propiedad del proyecto y no en el código.

## Después de agregarlo

Este archivo pide un permiso nuevo (`UrlFetchApp`, para poder salir a
internet). Si ya habías publicado la app, crea una nueva versión en
**Implementar → Administrar implementaciones** y cada persona que la use
tendrá que autorizarla otra vez la primera vez que la abra.

## Privacidad

La clave vive del lado del servidor (en Propiedades del proyecto) y nunca
viaja al navegador. Cada quien que instale este proyecto usa su propia clave;
no hay ninguna clave compartida entre instalaciones distintas.
