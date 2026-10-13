-- Comentarios de los testers sobre cada pantalla (escenario) del prototipo.
CREATE TABLE IF NOT EXISTS comentarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escenario TEXT NOT NULL,                      -- código del escenario: R1, 1a, …
  nombre TEXT NOT NULL,                         -- quién comenta
  comentario TEXT NOT NULL,
  vista TEXT NOT NULL DEFAULT 'mobile',         -- mobile | desktop: cómo estaba viendo la pantalla
  estado TEXT NOT NULL DEFAULT 'abierto',       -- abierto | resuelto
  creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resuelto TEXT                                 -- cuándo se marcó como resuelto
);

CREATE INDEX IF NOT EXISTS idx_comentarios_escenario ON comentarios (escenario, creado);
