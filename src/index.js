// Worker del portal STAR: pide una contraseña única y después sirve los
// archivos estáticos de public/. Todo pedido pasa primero por acá
// (assets.run_worker_first en wrangler.jsonc), salvo /assets/*, que es
// público porque lo usa la pantalla de acceso.

const COOKIE = "star_session";
const SESSION_DAYS = 7;
const PUBLIC_PREFIXES = ["/assets/"];
// Cada escenario es la misma app (public/visita.html); el código va en la URL.
const SCENARIO_PATH = /^\/escenarios\/[\w-]+\/?$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/login") {
      if (request.method === "POST") return login(request, env, url);
      if (await isAuthenticated(request, env)) return redirect(url, "/");
      return env.ASSETS.fetch(new Request(new URL("/login", url), request));
    }

    if (pathname === "/salir") {
      return redirect(url, "/login", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    }

    if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return env.ASSETS.fetch(request);
    }

    if (!(await isAuthenticated(request, env))) {
      if (pathname.startsWith("/api/")) return json({ error: "Sesión vencida: volvé a ingresar." }, 401);
      const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + url.search)}`;
      return redirect(url, `/login${next}`);
    }

    if (pathname.startsWith("/api/")) return api(request, env, url);

    const asset = SCENARIO_PATH.test(pathname) ? new Request(new URL("/visita", url), request) : request;
    const response = await env.ASSETS.fetch(asset);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};

// ── Comentarios de los testers (D1) ─────────────────────────
// GET    /api/comentarios[?escenario=R1]   lista, más nuevos primero
// POST   /api/comentarios                  { escenario, nombre, comentario, vista }
// PATCH  /api/comentarios/:id              { estado: "abierto" | "resuelto" }
async function api(request, env, url) {
  const { pathname } = url;
  if (pathname === "/api/comentarios" && request.method === "GET") {
    const escenario = url.searchParams.get("escenario");
    const query = escenario
      ? env.DB.prepare("SELECT * FROM comentarios WHERE escenario = ?1 ORDER BY creado DESC, id DESC LIMIT 200").bind(escenario)
      : env.DB.prepare("SELECT * FROM comentarios ORDER BY creado DESC, id DESC LIMIT 500");
    const { results } = await query.all();
    return json({ comentarios: results });
  }

  if (pathname === "/api/comentarios" && request.method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "No se pudo leer el comentario." }, 400);
    const escenario = String(body.escenario || "").trim();
    const nombre = String(body.nombre || "").trim();
    const comentario = String(body.comentario || "").trim();
    const vista = body.vista === "desktop" ? "desktop" : "mobile";
    if (!/^[\w-]{1,12}$/.test(escenario)) return json({ error: "Pantalla desconocida." }, 400);
    if (!nombre || nombre.length > 80) return json({ error: "Escribí tu nombre (hasta 80 caracteres)." }, 400);
    if (!comentario || comentario.length > 2000) return json({ error: "Escribí el comentario (hasta 2000 caracteres)." }, 400);
    const row = await env.DB.prepare(
      "INSERT INTO comentarios (escenario, nombre, comentario, vista) VALUES (?1, ?2, ?3, ?4) RETURNING *"
    )
      .bind(escenario, nombre, comentario, vista)
      .first();
    return json({ comentario: row }, 201);
  }

  const byId = pathname.match(/^\/api\/comentarios\/(\d+)$/);
  if (byId && request.method === "PATCH") {
    const body = await readJson(request);
    if (!body || !["abierto", "resuelto"].includes(body.estado)) return json({ error: "Estado inválido." }, 400);
    const row = await env.DB.prepare(
      "UPDATE comentarios SET estado = ?1, resuelto = CASE WHEN ?1 = 'resuelto' THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now') ELSE NULL END WHERE id = ?2 RETURNING *"
    )
      .bind(body.estado, Number(byId[1]))
      .first();
    return row ? json({ comentario: row }) : json({ error: "El comentario no existe." }, 404);
  }

  return json({ error: "No encontrado." }, 404);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function login(request, env, url) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const next = safeNext(String(form.get("next") || "/"));

  if (!(await passwordMatches(password, env))) {
    const query = new URLSearchParams({ error: "1" });
    if (next !== "/") query.set("next", next);
    return redirect(url, `/login?${query}`);
  }

  const token = await sessionToken(env);
  const cookie = `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
  return redirect(url, next, cookie);
}

async function passwordMatches(password, env) {
  if (!env.PASSWORD_HASH) throw new Error("Falta PASSWORD_HASH en la configuración del Worker");
  const candidate = await sha256(password);
  return timingSafeEqual(candidate, env.PASSWORD_HASH.toLowerCase());
}

// La sesión depende del hash vigente: si se cambia la contraseña, todas las sesiones caen.
async function sessionToken(env) {
  return sha256(`star-session:v1:${env.PASSWORD_HASH}`);
}

async function isAuthenticated(request, env) {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  if (!match) return false;
  return timingSafeEqual(match[1], await sessionToken(env));
}

function safeNext(next) {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}

function redirect(url, location, cookie) {
  const headers = new Headers({ Location: new URL(location, url).toString(), "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.byteLength !== right.byteLength) return false;
  return crypto.subtle.timingSafeEqual(left, right);
}
