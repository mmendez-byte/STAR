# Proyecto STAR · SullairGo

Portal privado para recorrer los escenarios de la pantalla de **seguimiento de visita técnica** de SullairGo (proyecto STAR, Linear P-SUL-33). El cliente recibe un link por WhatsApp y ve el estado de la visita sin necesidad de loguearse; acá se revisan esas pantallas con **datos ilusorios**.

- **Mobile first**: en el celular cada escenario se ve a pantalla completa, como lo vería el cliente. En pantallas anchas aparece dentro del marco de teléfono.
- **Acceso con contraseña única** (seguridad básica, sin usuarios). La sesión dura 7 días.
- Corre en **Cloudflare Workers** con assets estáticos. No hay build: lo que está en `public/` es lo que se publica.

## Escenarios

**Reprogramación y cancelación** (interactivos, plantilla `design/escenarios/reprogramacion.html`):

| Código | Escenario | Estado inicial |
|---|---|---|
| R1 | Nunca reprogramó | Visita del jueves 15/10, 2 reprogramaciones disponibles |
| R2 | Reprogramó una vez | Lunes 19/10, queda 1 reprogramación |
| R3 | Reprogramó dos veces | Miércoles 21/10, sin reprogramaciones: solo puede cancelar |
| R4 | Cancela después de dos reprogramaciones | Pasó al día hábil siguiente (jueves 22/10) y quedó fija |
| R5 | Cancela Sullair | Visita cancelada por Sullair: el cliente elige nueva fecha |

**Seguimiento el día de la visita** (del board de Claude Design): 1a Técnico en camino · 1b En sitio, 3 equipos · 1c Visita finalizada · 2a Vista desktop. Además está el **board completo** en `/board`.

Cada escenario arranca en su estado y se puede recorrer: desde R1 se llega a R4 reprogramando dos veces y cancelando. "Reiniciar escenario" lo devuelve al estado inicial.

### Regla de reprogramación (en prueba)

- El cliente puede **reprogramar hasta 2 veces**, eligiendo fecha (próximos 4 días hábiles) y franja.
- **Antes de cada reprogramación aparece un modal** que avisa que reprogramar tiene un costo (reorganiza la agenda de los técnicos y demora a otros clientes) y que no es ilimitado. La acción principal del modal es *Mantener la fecha*.
- Con las 2 reprogramaciones usadas, el link pasa a *Cancelar visita*: si cancela, la visita **pasa al día hábil siguiente** y ya no admite cambios.
- Si **cancela Sullair**, el cliente elige la nueva fecha y **no se le descuenta** ninguna reprogramación. Es el único caso donde la acción es un botón principal.
- Reprogramar queda en segundo plano: link al pie de la pantalla.

Supuestos a validar con Sullair:

1. ¿Reprogramar tiene un cargo económico? Hoy el texto habla de costo operativo; si hay un monto, va en el modal.
2. "Día siguiente" se cuenta desde la fecha que se cancela y salta fines de semana.
3. Aplica a preventivos (la coordinación de correctivos es otra).
4. Cada cambio avisa a Servicio Técnico (los destinatarios ya están definidos del lado de Sullair). En la demo no se envía nada.
5. Falta definir hasta cuándo se puede reprogramar (por ejemplo, hasta el día anterior).

## Estructura

```
design/
  Seguimiento_de_visita_SullairGo.html   export original del board (Claude Design)
  escenarios/reprogramacion.html         plantilla de R1–R5 (fuera del board)
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

**Conectado al repo (Workers Builds).** El Worker `sullairgo-star` se despliega solo en cada push a la rama de producción. Configuración en *Workers & Pages → sullairgo-star → Settings → Builds*:

| Campo | Valor |
|---|---|
| Git repository | `mmendez-byte/STAR` |
| Production branch | `claude/ecstatic-davinci-dlge83` |
| Build command | *(vacío)* |
| Deploy command | `npx wrangler deploy` |

El nombre del Worker en Cloudflare tiene que coincidir con `name` en `wrangler.jsonc`, o el build falla. La URL pública figura en la pestaña *Domains* del Worker.

**Manual, desde la terminal.**

```bash
npx wrangler login
npm run deploy
```
