import "./config/env.js";
import { spawn } from "node:child_process";
import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import type { ErroApi, HealthResponse } from "../shared/api.js";
import { Agendador } from "./agendamento/agendador.js";
import { registroRotinas, tarefasColeta, tarefasNotificacao, tarefasProcessamento } from "./agendamento/tarefas.js";
import { ErroModeloLinguagem } from './portas/ModeloLinguagemPorta.js';
import { ErroNegocio } from "./dominio/erros.js";
import { ehErroDeConexaoNuvem } from "./db/conexao.js";
import { bancoVazio } from "./db/index.js";
import { appUrl, porta } from "./config/app.js";
import { ehExecutavel } from "./config/executavel.js";
import { pastaCliente, root } from "./config/paths.js";
import { criarBaseNova } from "./composicao.js";
import { rotasApi } from "./controllers/index.js";

const isProd = process.env.NODE_ENV === "production" || ehExecutavel;

// O executável cria a base sozinho na primeira vez, para quem testa não precisar de comandos.
if (bancoVazio() && ehExecutavel) criarBaseNova();

if (bancoVazio()) {
  console.error(
    "Banco não criado. Rode `npm run db:reset` (base nova) ou `npm run db:importar -- arquivo.db`.",
  );
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "35mb" }));

// ---- API ----
app.get("/api/health", (_req, res) => {
  const body: HealthResponse = { ok: true, time: new Date().toISOString() };
  res.json(body);
});

app.use("/api", rotasApi);

const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof ErroNegocio) {
    res.status(erro.status).json({ erro: erro.message, ...erro.dados });
    return;
  }
  if (erro instanceof ErroModeloLinguagem) {
    res.status(erro.statusCode).json({ erro: erro.message });
    return;
  }
  console.error(erro);
  if (ehErroDeConexaoNuvem(erro)) {
    const corpo: ErroApi = { erro: "Sem conexão com a base na nuvem. Confira a internet e tente de novo." };
    res.status(503).json(corpo);
    return;
  }
  const corpo: ErroApi = { erro: "Erro interno do servidor." };
  res.status(500).json(corpo);
};
app.use("/api", tratarErro);

// ---- Front-end ----
// Sem await no topo do arquivo: o executável empacota o servidor como CommonJS, que não aceita.
async function servirFrontEnd(): Promise<void> {
  if (isProd) {
    app.use(express.static(pastaCliente));
    app.get(/^(?!\/api).*/, (_req, res) =>
      res.sendFile(path.join(pastaCliente, "index.html")),
    );
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
}

function iniciar(): void {
  app.listen(porta, (erro) => {
    if (erro) {
      console.error(`Não foi possível abrir o sistema na porta ${porta}: ${erro.message}`);
      if (!ehExecutavel) process.exit(1);
      // Aberto com dois cliques: mantém a janela para a mensagem ser lida.
      console.error(`Outro programa (ou o próprio sistema, já aberto) está usando a porta. Feche-o ou troque a porta com APP_URL num arquivo .env em ${root}.`);
      console.error("Tecle Enter para fechar.");
      process.stdin.once("data", () => process.exit(1));
      return;
    }
    console.log(appUrl);
    if (ehExecutavel) {
      console.log(`Dados em ${root}`);
      console.log("Gestor de Editais aberto no navegador. Feche esta janela para encerrar o sistema.");
      spawn("cmd", ["/c", "start", "", appUrl], { detached: true, stdio: "ignore" }).unref();
    }
    new Agendador(
      [...tarefasColeta(), ...tarefasNotificacao, ...tarefasProcessamento],
      60_000,
      registroRotinas,
    ).iniciar();
  });
}

servirFrontEnd().then(iniciar);
