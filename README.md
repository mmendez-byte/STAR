# Proyecto STAR · SullairGo

Portal privado para recorrer los escenarios de la pantalla de **seguimiento de visita técnica** de SullairGo (proyecto STAR, Linear P-SUL-33). El cliente recibe un link por WhatsApp y ve el estado de la visita sin necesidad de loguearse; acá se revisan esas pantallas con **datos ilusorios**.

- **Mobile first**: en el celular cada escenario se ve a pantalla completa, como lo vería el cliente. En pantallas anchas aparece dentro del marco de teléfono.
- **Acceso con contraseña única** (seguridad básica, sin usuarios). La sesión dura 7 días.
- Corre en **Cloudflare Workers** con assets estáticos. No hay build: lo que está en `public/` es lo que se publica.

## Escenarios

| Código | Escenario | Origen |
|---|---|---|
| 0a | Visita programada · reprogramación (interactivo) | Armado a mano: `design/escenarios/0a.html` |
| 1a | Técnico en camino · 1 equipo | Board de Claude Design |
| 1b | En sitio · 3 equipos | Board de Claude Design |
| 1c | Visita finalizada | Board de Claude Design |
| 2a | Desktop · Técnico en camino | Board de Claude Design |

Además está el **board completo** en `/board`.

### Regla de reprogramación (0a, en prueba)

- El cliente puede cancelar la fecha de la visita **hasta 2 veces**.
- En la primera elige la nueva fecha (próximos 4 días hábiles) y la franja.
- La segunda es la última: la visita pasa **obligatoriamente al día hábil siguiente**; solo elige la franja.
- Después no hay más cambios: se muestra que tiene que contactar a su ejecutivo de cuenta.
- La opción de reprogramar queda en segundo plano: link al pie de la pantalla, no botón.

Supuestos a validar con Sullair:

1. "Día siguiente" se cuenta desde la fecha que se cancela y salta fines de semana.
2. Aplica a preventivos (la coordinación de correctivos es otra).
3. Cada cambio avisa a Servicio Técnico (los destinatarios ya están definidos del lado de Sullair). En la demo no se envía nada.
4. Falta definir hasta cuándo se puede reprogramar (por ejemplo, hasta el día anterior).

## Estructura

```
design/
  Seguimiento_de_visita_SullairGo.html   export original del board (Claude Design)
  escenarios/0a.html                     escenarios propios, fuera del board
scripts/
  extract_board.py                       genera public/ a partir de design/
  thumbs.mjs                             genera las miniaturas del hub (Playwright)
  hash-password.mjs                      hash de la contraseña de acceso
src/index.js                             Worker: login, sesión y salida
public/                                  sitio estático (generado + assets)
wrangler.jsonc                           configuración de Cloudflare
```

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:8787
```

## Actualizar el board

Cuando llega una nueva versión del diseño:

```bash
cp ~/Downloads/Seguimiento_de_visita_SullairGo.html design/
npm run build:escenarios
# miniaturas del hub (con npm run dev corriendo y Playwright instalado):
STAR_PASSWORD='…' node scripts/thumbs.mjs
```

Si el board trae un componente nuevo del design system (`<x-import …>`), el script avisa y hay que agregarlo en `replace_ds_components()` y en `public/assets/css/sgo-components.css`.

## Contraseña

`wrangler.jsonc` guarda solo el hash SHA-256 (`PASSWORD_HASH`). Para cambiarla:

```bash
npm run hash -- "NuevaContraseña"
```

Se pega el resultado en `PASSWORD_HASH` y se despliega. Al cambiarla se cierran todas las sesiones abiertas.

## Despliegue en Cloudflare

**Opción A · conectar el repo (recomendada).** En el dashboard de Cloudflare: *Workers & Pages → Create → Import a repository*, elegir `mmendez-byte/STAR` y la rama a publicar. Cloudflare toma `wrangler.jsonc`, corre `npx wrangler deploy` y vuelve a desplegar en cada push. Queda en `https://sullairgo-star.<subdominio>.workers.dev`.

**Opción B · desde la terminal.**

```bash
npx wrangler login
npm run deploy
```
