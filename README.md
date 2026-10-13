# Proyecto STAR · SullairGo

Prototipo navegable de la pantalla de **seguimiento de visita técnica** de SullairGo (proyecto STAR, Linear P-SUL-33). El cliente recibe un link por WhatsApp y ve el estado de la visita sin necesidad de loguearse; acá se recorre esa experiencia con **datos ilusorios**, como si la plataforma estuviera funcionando.

- **Una sola app responsive.** En el celular se ve y se usa como una app a pantalla completa (se puede agregar a la pantalla de inicio). En desktop, layout ancho con el mapa protagonista y los paneles a la derecha.
- **Mapa real**: Leaflet con las teselas estándar de OpenStreetMap (sin clave; para producción conviene un proveedor con contrato). El recorrido del técnico se calcula por calles con el servicio público de OSRM; si no responde, se dibuja una línea directa.
- **Acceso con contraseña única** (seguridad básica, sin usuarios). La sesión dura 7 días.
- Corre en **Cloudflare Workers** con assets estáticos. No hay build: lo que está en `public/` es lo que se publica.

## Escenarios

Cada escenario es la misma app en otro estado: `/escenarios/<código>`. Un botón flotante abajo a la derecha permite cambiar de escenario sin salir de la app.

**Programación y reprogramación** (interactivos):

| Código | Escenario | Estado inicial |
|---|---|---|
| R1 | Nunca reprogramó | Visita del jueves 15/10, 2 reprogramaciones disponibles |
| R2 | Reprogramó una vez | Lunes 19/10, queda 1 reprogramación |
| R3 | Reprogramó dos veces | Miércoles 21/10, sin reprogramaciones: solo puede cancelar |
| R4 | Cancela después de dos reprogramaciones | Pasó al día hábil siguiente (jueves 22/10) y quedó fija |
| R5 | Cancela Sullair | Visita cancelada por Sullair: el cliente elige nueva fecha |

**El día de la visita**: 1a Técnico en camino (mapa con el recorrido) · 1b En sitio, 3 equipos · 1c Visita finalizada.

Desde R1 se llega a R4 reprogramando dos veces y cancelando. "Reiniciar escenario" (en el botón flotante) lo devuelve al estado inicial. El board original de Claude Design queda como referencia en `/board`.

### Regla de reprogramación (en prueba)

- El cliente puede **reprogramar hasta 2 veces** marcando su disponibilidad: **uno o varios días** (próximos 6 días hábiles) y **mañana, tarde o ambas** franjas. El criterio es al menos un día y al menos una franja.
- Con un solo día, la nueva fecha queda confirmada en el momento. Con varios, queda "a confirmar" y Sullair elige día y franja; en la demo, la confirmación llega sola a los 4 segundos (toma el primer día y la primera franja marcados).
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

## Comentarios de testers

En cada pantalla hay una bolita flotante (encima de la del escenario) para dejar un comentario con nombre: queda asociado a esa pantalla y a si se estaba viendo en celular o desktop. El nombre se recuerda en el navegador. La bolita muestra cuántos comentarios abiertos tiene la pantalla. Los testers comentan y ven los comentarios; no pueden resolverlos ni borrarlos.

Se guardan en **Cloudflare D1** (base `sullairgo-star`, tabla `comentarios`; esquema en `migrations/`).

### Administración

Separada de la interfaz de testers: no hay ningún enlace ni acción de admin en el hub ni en las pantallas.

- Se entra solo con el **link de administración** (`/admin?clave=<clave>`), que deja el navegador en modo admin por 30 días con una cookie propia. Sin esa cookie, `/admin` responde "No encontrado".
- `/admin`, pestaña **Comentarios de testers**: todos los comentarios en una tabla, filtro abiertos / resueltos / todos, marcar resuelto o reabrir, borrar y **descargar CSV**.
- `/admin#notas`, pestaña **Notas de reuniones**: selector de fecha (con flechas y "Hoy"), título y notas libres por día, guardado automático y lista de las reuniones anotadas. Tabla `notas` en D1, una nota por fecha.
- "Salir del modo admin" borra la cookie de admin.
- El repo solo guarda el hash de la clave (`ADMIN_TOKEN_HASH` en `wrangler.jsonc`). Para cambiarla: `npm run hash -- "NuevaClave"`, pegar el resultado y desplegar; el link anterior deja de funcionar.

API: `GET /api/comentarios[?escenario=R1]` y `POST /api/comentarios` con la sesión de testers; `PATCH` y `DELETE /api/comentarios/:id` y todo `/api/notas` solo en modo admin.

Para leerlos desde la terminal:

```bash
npx wrangler d1 execute sullairgo-star --remote --command "SELECT escenario, nombre, comentario, estado, creado FROM comentarios ORDER BY creado DESC"
```

En local, antes de `npm run dev`: `npx wrangler d1 migrations apply sullairgo-star --local`.

## Estructura

```
public/
  visita.html            la app (un solo HTML para todos los escenarios)
  app/data.js            datos ilusorios: escenarios, equipos, planta, técnico
  app/app.js             render, mapa, reprogramación y botón de demo
  app/app.css            estilos mobile first (desktop desde 900 px)
  app/comentarios.js     bolita y panel de comentarios de testers
  admin.html             administración: comentarios y notas de reuniones (solo con el link de admin)
  index.html             hub de escenarios (lee app/data.js)
  login.html             pantalla de acceso
  board.html             board de Claude Design (referencia)
  vendor/leaflet/        Leaflet 1.9.4
  assets/                tokens SullairGo, tipografías, logo, íconos, manifest
src/index.js             Worker: login, modo admin, ruteo de /escenarios/<código> y API de comentarios
migrations/              esquema de D1
design/                  export original del board (Claude Design)
scripts/
  extract_board.py       desempaqueta el export: assets, tokens y board
  thumbs.mjs             miniaturas del hub (Playwright)
  hash-password.mjs      hash de la contraseña de acceso
wrangler.jsonc           configuración de Cloudflare
```

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:8787
```

Para sumar o cambiar un escenario se edita `public/app/data.js` (y la lógica en `app.js` si es un estado nuevo). Después se regeneran las miniaturas del hub, con `npm run dev` corriendo y Playwright instalado:

```bash
STAR_PASSWORD='…' node scripts/thumbs.mjs
```

Si llega una nueva versión del board de diseño: `cp …/Seguimiento_de_visita_SullairGo.html design/ && npm run build:board` (actualiza tokens, tipografías, logo y `/board`).

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
