-- Notas de reuniones (solo admin): una nota por fecha.
CREATE TABLE IF NOT EXISTS notas (
  fecha TEXT PRIMARY KEY,                       -- AAAA-MM-DD
  titulo TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
