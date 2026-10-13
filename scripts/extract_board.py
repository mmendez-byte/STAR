#!/usr/bin/env python3
"""Genera las páginas de escenarios a partir del export de Claude Design.

Uso:
    python3 scripts/extract_board.py design/Seguimiento_de_visita_SullairGo.html

El export es un HTML "bundled": los assets van en base64 dentro de un
manifest y el markup del board en un template JSON. Este script:

  1. Desempaqueta logo, mapas y tipografías a public/assets/.
  2. Reemplaza los componentes del design system (<x-import> Badge/Button)
     por HTML estático con las clases de sgo-components.css.
  3. Escribe una página por escenario (public/escenarios/<id>.html),
     el board completo (public/board.html) y el hub (public/index.html).

Cuando llegue una nueva versión del board, se reemplaza el archivo en
design/ y se vuelve a correr este script.
"""
import base64
import gzip
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ASSETS = PUBLIC / "assets"

# Assets del export que se usan en el board, con nombre estable.
IMAGE_NAMES = {
    "image/png": "sullairgo-logo.jpg",  # el export lo declara png pero es un JPEG
}
SVG_NAMES = ["mapa-en-camino.svg", "mapa-en-sitio.svg"]

FONT_FILES = {
    ("Nunito", "latin"): "nunito-latin.woff2",
    ("Nunito", "latin-ext"): "nunito-latin-ext.woff2",
    ("Nunito Sans", "latin"): "nunito-sans-latin.woff2",
    ("Nunito Sans", "latin-ext"): "nunito-sans-latin-ext.woff2",
}

SCENARIO_ORDER = ["1a", "1b", "1c", "2a"]

BOARD_GROUP = "Seguimiento el día de la visita"

# Escenarios armados a mano (no vienen del board). Comparten la plantilla
# design/escenarios/reprogramacion.html y cambian el estado inicial.
# Fechas ilusorias: la visita original es el jueves 15/10/2026.
REPROGRAMACION = "design/escenarios/reprogramacion.html"
EXTRA_GROUP = "Reprogramación y cancelación"
EXTRA_SCENARIOS = [
    {"id": "R1", "title": "Nunca reprogramó", "state": {"used": 0, "date": "2026-10-15", "slot": "manana", "status": "programada"}},
    {"id": "R2", "title": "Reprogramó una vez", "state": {"used": 1, "date": "2026-10-19", "slot": "manana", "status": "reprogramada"}},
    {"id": "R3", "title": "Reprogramó dos veces", "state": {"used": 2, "date": "2026-10-21", "slot": "tarde", "status": "reprogramada"}},
    {"id": "R4", "title": "Cancela después de dos reprogramaciones", "state": {"used": 2, "date": "2026-10-22", "slot": "tarde", "status": "dia-siguiente"}},
    {"id": "R5", "title": "Cancela Sullair", "state": {"used": 0, "date": "2026-10-15", "slot": "manana", "status": "cancelada-sullair"}},
]


def read_bundle(path):
    src = Path(path).read_text(encoding="utf-8")

    def block(kind):
        m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % kind, src, re.S)
        if not m:
            sys.exit(f"No se encontró el bloque __bundler/{kind} en {path}")
        return m.group(1)

    manifest = json.loads(block("manifest"))
    template = json.loads(block("template"))
    return manifest, template


def decode(entry):
    data = base64.b64decode(entry["data"])
    return gzip.decompress(data) if entry.get("compressed") else data


def balanced_div(markup, start):
    """Devuelve el fin (exclusivo) del <div> que abre en `start`."""
    depth = 0
    for m in re.finditer(r"<div\b|</div>", markup[start:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            return start + m.end()
    raise ValueError("div sin cerrar")


def replace_ds_components(markup):
    def badge(m):
        attrs, label = m.group(1), m.group(2)
        tone = re.search(r'tone="(\w+)"', attrs)
        tone = tone.group(1) if tone else "info"
        dot = '<span class="sgo-badge__dot"></span>' if 'dot="{{ true }}"' in attrs else ""
        return f'<span class="sgo-badge sgo-badge--{tone}">{dot}{label}</span>'

    def button(m):
        attrs, label = m.group(1), m.group(2)
        variant = re.search(r'variant="(\w+)"', attrs)
        size = re.search(r'size="(\w+)"', attrs)
        cls = f"sgo-btn sgo-btn--{variant.group(1) if variant else 'primary'} sgo-btn--{size.group(1) if size else 'md'}"
        return f'<a class="{cls}" href="#" role="button">{label}</a>'

    markup = re.sub(
        r'<x-import component-from-global-scope="[\w]+\.Badge"([^>]*)>(.*?)</x-import>', badge, markup
    )
    markup = re.sub(
        r'<x-import component-from-global-scope="[\w]+\.Button"([^>]*)>(.*?)</x-import>', button, markup
    )
    if "<x-import" in markup:
        sys.exit("Quedó un <x-import> sin traducir: agregar el componente a replace_ds_components().")
    return markup


def write_assets(manifest, template):
    """Escribe los assets y devuelve {uuid: url pública}."""
    urls = {}
    svgs = iter(SVG_NAMES)
    for uuid, entry in manifest.items():
        mime = entry["mime"]
        if mime in IMAGE_NAMES:
            name = IMAGE_NAMES[mime]
        elif mime == "image/svg+xml":
            # Orden de aparición en el board: 1a usa el mapa en camino, 1b el de sitio.
            continue
        else:
            continue
        (ASSETS / "img" / name).write_bytes(decode(entry))
        urls[uuid] = f"/assets/img/{name}"

    svg_uuids = [u for u, e in manifest.items() if e["mime"] == "image/svg+xml"]
    svg_uuids.sort(key=lambda u: template.find(u))
    for uuid in svg_uuids:
        name = next(svgs)
        (ASSETS / "img" / name).write_bytes(decode(manifest[uuid]))
        urls[uuid] = f"/assets/img/{name}"

    # Tipografías: solo los subsets latin y latin-ext.
    font_rules = []
    seen = set()
    for m in re.finditer(
        r"/\* (\S+) \*/\s*@font-face \{\s*font-family: '([^']+)';\s*font-style: (\w+);\s*"
        r"font-weight: (\d+);.*?src: url\(\"([^\"]+)\"\) format\('woff2'\);\s*unicode-range: ([^;]+);",
        template,
        re.S,
    ):
        subset, family, style, weight, uuid, urange = m.groups()
        key = (family, subset)
        if key not in FONT_FILES:
            continue
        name = FONT_FILES[key]
        if name not in seen:
            (ASSETS / "fonts" / name).write_bytes(decode(manifest[uuid]))
            seen.add(name)
        rule = (
            f"@font-face {{\n  font-family: '{family}';\n  font-style: {style};\n  font-weight: {weight};\n"
            f"  font-display: swap;\n  src: url('/assets/fonts/{name}') format('woff2');\n  unicode-range: {urange};\n}}"
        )
        if rule not in font_rules:
            font_rules.append(rule)
    return urls, font_rules


def write_tokens_css(template, font_rules):
    """Tokens del design system SullairGo tal como vienen en el export."""
    blocks = []
    for title in ["SullairGo Colors", "SullairGo Typography", "SullairGo Spacing", "SullairGo Border Radius", "SullairGo Shadows"]:
        m = re.search(r"<style>(/\* ── %s ──.*?)</style>" % re.escape(title), template, re.S)
        if not m:
            sys.exit(f"No se encontró el bloque de tokens '{title}'")
        blocks.append(m.group(1).strip())
    header = "/* Generado por scripts/extract_board.py desde el export de Claude Design. No editar a mano. */\n\n"
    (ASSETS / "css" / "sgo-tokens.css").write_text(
        header + "\n\n".join(font_rules) + "\n\n" + "\n\n".join(blocks) + "\n", encoding="utf-8"
    )


def extract_scenarios(body):
    scenarios = []
    for sid in SCENARIO_ORDER:
        start = body.find(f'<div id="{sid}"')
        if start < 0:
            sys.exit(f"No se encontró el escenario {sid} en el board")
        end = balanced_div(body, start)
        block = body[start:end]
        inner_start = block.find(">") + 1
        inner = block[inner_start : block.rfind("</div>")]

        # Primer hijo: la etiqueta "1a · Título" del board. Se reemplaza por la barra superior.
        label_start = inner.find("<div")
        label_end = balanced_div(inner, label_start)
        label = inner[label_start:label_end]
        title = re.findall(r"<span[^>]*>([^<]+)</span>", label)[-1].strip()
        content = inner[label_end:].strip()

        device = "desktop" if "width:1180px" in content else "mobile"
        if device == "mobile":
            content = content.replace(
                'style="width:414px;box-sizing:border-box;background:#0e1213;border-radius:46px',
                'class="device" style="width:414px;box-sizing:border-box;background:#0e1213;border-radius:46px',
                1,
            )
            content = content.replace(
                'style="width:390px;background:var(--surface-page);border-radius:34px',
                'class="device-screen" style="width:390px;background:var(--surface-page);border-radius:34px',
                1,
            )
            content = re.sub(
                r'<div style="(position:relative;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;opacity:\.92)">(\s*<span>9:41</span>)',
                r'<div class="device-statusbar" style="\1">\2',
                content,
                count=1,
            )
            content = re.sub(
                r'<div style="width:390px;background:#fff;border:1\.5px dashed',
                r'<div class="design-note" style="width:390px;background:#fff;border:1.5px dashed',
                content,
            )
        else:
            content = content.replace(
                '<div style="width:1180px;max-width:100%',
                '<div class="browser" style="width:1180px;max-width:100%',
                1,
            )
        scenarios.append({"id": sid, "title": title, "device": device, "group": BOARD_GROUP, "content": content})
    return scenarios


HEAD = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/sgo-tokens.css">
<link rel="stylesheet" href="/assets/css/sgo-components.css">
<link rel="stylesheet" href="/assets/css/portal.css">
</head>
"""

TOPBAR = """<header class="topbar">
  <a class="topbar__brand" href="/" aria-label="Volver a escenarios">
    <img src="/assets/img/sullairgo-logo.jpg" alt="SullairGo" class="logo-on-dark">
    <span class="topbar__project">Proyecto STAR</span>
  </a>
  {center}
  <a class="topbar__action" href="/salir">Salir</a>
</header>
"""

HOME_BUTTON = """<a class="topbar__home" href="/" aria-label="Volver a escenarios">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  </a>"""

DEVICE_LABEL = {"mobile": "Mobile", "desktop": "Desktop"}


def scenario_page(sc, prev_sc, next_sc):
    center = HOME_BUTTON + f"""
  <nav class="pager" aria-label="Escenarios">
    <a class="pager__step" href="/escenarios/{prev_sc['id']}" aria-label="Escenario anterior: {html.escape(prev_sc['title'])}" data-key="ArrowLeft">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    </a>
    <div class="pager__current"><span class="code">{sc['id']}</span><span class="pager__title">{html.escape(sc['title'])}</span></div>
    <a class="pager__step" href="/escenarios/{next_sc['id']}" aria-label="Escenario siguiente: {html.escape(next_sc['title'])}" data-key="ArrowRight">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
    </a>
  </nav>"""
    return (
        HEAD.format(title=f"{sc['id']} · {html.escape(sc['title'])} · STAR")
        + '<body class="page page--scenario">\n'
        + TOPBAR.format(center=center)
        + f'<main class="stage stage--{sc["device"]}">\n{sc["content"]}\n</main>\n'
        + '<script src="/assets/js/pager.js" defer></script>\n</body>\n</html>\n'
    )


def board_page(body):
    center = HOME_BUTTON + '\n  <div class="pager pager--static"><div class="pager__current"><span class="pager__title">Board completo</span></div></div>'
    return (
        HEAD.format(title="Board completo · STAR")
        + '<body class="page page--board">\n'
        + TOPBAR.format(center=center)
        + f'<main class="board-canvas">\n{body}\n</main>\n</body>\n</html>\n'
    )


def short_title(title):
    # En el hub el dispositivo ya va en la meta: "Desktop · Técnico en camino" -> "Técnico en camino".
    return re.sub(r"^(Desktop|Mobile) · ", "", title)


def load_extra_scenarios():
    template = (ROOT / REPROGRAMACION).read_text(encoding="utf-8")
    template = re.sub(r"^\s*<!--.*?-->\s*", "", template, flags=re.S).strip()
    scenarios = []
    for extra in EXTRA_SCENARIOS:
        state = html.escape(json.dumps(extra["state"]), quote=True)
        content = template.replace("__ID__", extra["id"]).replace("__STATE__", state)
        scenarios.append({**extra, "device": "mobile", "interactive": True, "group": EXTRA_GROUP, "content": content})
    return scenarios


def hub_page(scenarios):
    sections = []
    groups = list(dict.fromkeys(sc["group"] for sc in scenarios))
    for g, group in enumerate(groups):
        items = [hub_item(i, sc) for i, sc in enumerate(s for s in scenarios if s["group"] == group)]
        sections.append(
            f"""  <section class="hub__section" aria-labelledby="grupo-{g}">
    <h2 id="grupo-{g}">{html.escape(group)}</h2>
    <ul class="scenario-grid" role="list">
""" + "\n".join(items) + """
    </ul>
  </section>"""
        )
    return (
        HEAD.format(title="Proyecto STAR · SullairGo")
        + '<body class="page page--hub">\n'
        + TOPBAR.format(center="")
        + """<main class="hub">
  <div class="hub__header">
    <p class="eyebrow">SullairGo · Seguimiento de visita técnica</p>
    <h1>Escenarios</h1>
  </div>
"""
        + "\n".join(sections)
        + """
  <a class="hub__board" href="/board">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    Ver board completo
  </a>
</main>
</body>
</html>
"""
    )


def hub_item(i, sc):
    return (
        f"""    <li style="--i:{i}">
      <a class="scenario-link" href="/escenarios/{sc['id']}">
        <span class="scenario-link__thumb scenario-link__thumb--{sc['device']}"><img src="/assets/img/thumbs/{sc['id']}.jpg" alt="" loading="lazy"></span>
        <span class="scenario-link__body">
          <span class="code">{sc['id']}</span>
          <span class="scenario-link__text">
            <span class="scenario-link__title">{html.escape(short_title(sc['title']))}</span>
            <span class="scenario-link__meta">{DEVICE_LABEL[sc['device']]}{' · interactivo' if sc.get('interactive') else ''}</span>
          </span>
          <svg class="scenario-link__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
      </a>
    </li>"""
    )


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    manifest, template = read_bundle(sys.argv[1])
    for d in ["css", "fonts", "img", "img/thumbs", "js"]:
        (ASSETS / d).mkdir(parents=True, exist_ok=True)
    (PUBLIC / "escenarios").mkdir(parents=True, exist_ok=True)

    urls, font_rules = write_assets(manifest, template)
    write_tokens_css(template, font_rules)

    body_start = template.find("</helmet>") + len("</helmet>")
    body = template[body_start : template.rfind("</x-dc>")].strip()
    for uuid, url in urls.items():
        body = body.replace(uuid, url)
    body = replace_ds_components(body)

    scenarios = load_extra_scenarios() + extract_scenarios(body)
    ids = {sc["id"] for sc in scenarios}
    for old in (PUBLIC / "escenarios").glob("*.html"):
        if old.stem not in ids:
            old.unlink()
    for old in (ASSETS / "img" / "thumbs").glob("*.jpg"):
        if old.stem not in ids:
            old.unlink()
    for i, sc in enumerate(scenarios):
        prev_sc = scenarios[i - 1]
        next_sc = scenarios[(i + 1) % len(scenarios)]
        (PUBLIC / "escenarios" / f"{sc['id']}.html").write_text(scenario_page(sc, prev_sc, next_sc), encoding="utf-8")

    (PUBLIC / "board.html").write_text(board_page(body), encoding="utf-8")
    (PUBLIC / "index.html").write_text(hub_page(scenarios), encoding="utf-8")
    (PUBLIC / "escenarios.json").write_text(
        json.dumps([{k: sc[k] for k in ("id", "title", "device")} for sc in scenarios], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for sc in scenarios:
        print(f"  {sc['id']}  {sc['device']:<8} {sc['title']}")
    print(f"OK: {len(scenarios)} escenarios + board + hub en {PUBLIC.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
