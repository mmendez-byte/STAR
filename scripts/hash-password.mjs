// Genera el hash SHA-256 de una contraseña para PASSWORD_HASH en wrangler.jsonc.
// Uso: npm run hash -- "NuevaContraseña"
import { createHash } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash -- "NuevaContraseña"');
  process.exit(1);
}
console.log(createHash("sha256").update(password).digest("hex"));
