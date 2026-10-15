import {
  abrirLocal,
  abrirRemota,
  lerConfigConexao,
  salvarConfigConexao,
  type ConfigConexao,
  type Conexao,
  type ModoBase,
} from "./conexao.js";

// Conexão única: com a base deste computador (node:sqlite) ou com a base na nuvem
// (Turso, via libsql). Fora dos repositórios, use só para schema e transações.
// `let` de propósito: trocarBase() substitui a conexão e todos os módulos passam a usar a nova.
export let db: Conexao;

type Estado = {
  modo: ModoBase;
  url: string;
  // Preenchido quando a nuvem estava configurada mas não abriu: o sistema seguiu com a base local.
  erroNuvem: string | null;
};

const estado: Estado = { modo: "LOCAL", url: "", erroNuvem: null };

function abrir(config: ConfigConexao): void {
  const nova = config.modo === "NUVEM" ? abrirRemota(config.url, config.token) : abrirLocal();
  fecharAtual();
  db = nova;
  Object.assign(estado, { modo: config.modo, url: config.modo === "NUVEM" ? config.url : "", erroNuvem: null });
}

function fecharAtual(): void {
  if (!db) return;
  try {
    (db as Conexao & { close(): void }).close();
  } catch {
    // Conexão já fechada.
  }
}

// Na inicialização: se a nuvem não abrir (sem internet, token revogado), segue com a base local.
const configInicial = lerConfigConexao();
try {
  abrir(configInicial);
} catch (erro) {
  console.error("Não foi possível abrir a base na nuvem; usando a base deste computador.", erro);
  abrir({ modo: "LOCAL", url: "", token: "" });
  estado.erroNuvem = (erro as Error).message;
  estado.url = configInicial.url;
}

export function estadoBase(): Readonly<Estado> {
  return { ...estado };
}

// Troca a base em uso sem reiniciar o servidor e grava a escolha para as próximas inicializações.
// Abre a nova antes de fechar a atual: se falhar, nada muda.
export function trocarBase(config: ConfigConexao): void {
  abrir(config);
  salvarConfigConexao(config);
}

export function bancoVazio(): boolean {
  return !db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'usuario'",
    )
    .get();
}

export function transacao<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const resultado = fn();
    db.exec("COMMIT");
    return resultado;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

export const agora = () => new Date().toISOString();
export const novoId = () => crypto.randomUUID();
