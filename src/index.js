// Worker del portal STAR: pide una contraseña única y después sirve los
// archivos estáticos de public/. Todo pedido pasa primero por acá
// (assets.run_worker_first en wrangler.jsonc), salvo /assets/*, que es
// público porque lo usa la pantalla de acceso.

const COOKIE = "star_session";
const SESSION_DAYS = 7;
const PUBLIC_PREFIXES = ["/assets/"];

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
      const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + url.search)}`;
      return redirect(url, `/login${next}`);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};

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
