// Equivalente de probarGemini(): pnpm probar:gemini (lee app/.env)
const llave = process.env.GEMINI_API_KEY
if (!llave) {
  console.error('Falta GEMINI_API_KEY en app/.env')
  process.exit(1)
}
// ponytail: sin process.exit tras el fetch; en Windows truena con un assert de libuv
const modelo = process.env.GEMINI_MODELO || 'gemini-3.5-flash-lite'
const r = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': llave },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Responde solo: ok' }] }] }),
  },
)
console.log(r.status, (await r.text()).slice(0, 300))
process.exitCode = r.ok ? 0 : 1
