#!/usr/bin/env python3
"""Desempaqueta el export de Claude Design: assets, tokens y board de referencia.

Uso:
    python3 scripts/extract_board.py design/Seguimiento_de_visita_SullairGo.html

El export es un HTML "bundled": los assets van en base64 dentro de un
manifest y el markup del board en un template JSON. Este script:

  1. Desempaqueta logo, mapas y tipografías a public/assets/.
  2. Reemplaza los componentes del design system (<x-import> Badge/Button)
     por HTML estático con las clases de sgo-components.css.
  3. Escribe el board completo (public/board.html), que queda como
     referencia de diseño. La app real está en public/visita.html + public/app/.

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

def board_page(body):
    center = HOME_BUTTON + '\n  <div class="pager pager--static"><div class="pager__current"><span class="pager__title">Board de diseño</span></div></div>'
    return (
        HEAD.format(title="Board de diseño · STAR")
        + '<body class="page page--board">\n'
        + TOPBAR.format(center=center)
        + f'<main class="board-canvas">\n{body}\n</main>\n</body>\n</html>\n'
    )


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    manifest, template = read_bundle(sys.argv[1])
    for d in ["css", "fonts", "img", "img/thumbs"]:
        (ASSETS / d).mkdir(parents=True, exist_ok=True)

    urls, font_rules = write_assets(manifest, template)
    write_tokens_css(template, font_rules)

    body_start = template.find("</helmet>") + len("</helmet>")
    body = template[body_start : template.rfind("</x-dc>")].strip()
    for uuid, url in urls.items():
        body = body.replace(uuid, url)
    body = replace_ds_components(body)

    (PUBLIC / "board.html").write_text(board_page(body), encoding="utf-8")
    print(f"OK: assets, tokens y board en {PUBLIC.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
