// Insere os editais de exemplo (ver seedEditais.ts) numa base sem editais.
// Uso: npm run db:seed-editais
import "../config/env.js";
import { bancoVazio, transacao } from "./index.js";
import { semearEditaisExemplo } from "./seedEditais.js";

if (bancoVazio()) {
  console.error("Banco não criado. Rode `npm run db:reset` antes.");
  process.exit(1);
}

if (transacao(semearEditaisExemplo)) console.log("editais de exemplo inseridos");
else {
  console.error("A base já tem editais; nada foi inserido. Rode `npm run db:reset` para começar de uma base vazia.");
  process.exit(1);
}
