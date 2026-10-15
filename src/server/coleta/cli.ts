import "../config/env.js";
import { repositorios } from "../repositorios/index.js";
import { cadastrarFontes, FONTES_AUTOMATICAS } from "./fontes.js";
import { ColetaServico } from "./servico.js";

cadastrarFontes(repositorios);
const nome = process.argv[2];
const fontes = repositorios.fonte
  .listarAtivas()
  .filter(
    (f) =>
      f.tipo === "SCRAPER" &&
      f.nome in FONTES_AUTOMATICAS &&
      (!nome || f.nome === nome),
  );
if (!fontes.length)
  throw new Error("Fonte ativa não encontrada. Use FINEP, CNPq ou Embrapii.");
const servico = new ColetaServico(repositorios);
for (const fonte of fontes) {
  try {
    await servico.coletar(fonte);
    console.log(`${fonte.nome}: concluída`);
  } catch (erro) {
    console.error(`${fonte.nome}:`, erro);
    process.exitCode = 1;
  }
}
