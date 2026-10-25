import "../config/env.js";
import { repositorios } from "../repositorios/index.js";
import { portalDaFonte } from "../servicos/coleta/portais/index.js";
import { coletaServico, fonteServico } from "../composicao.js";

fonteServico.garantirFontesPadrao();
const nome = process.argv[2];
const fontes = repositorios.fonte
  .listarAtivas()
  .filter(
    (f) =>
      f.tipo === "SCRAPER" &&
      portalDaFonte(f.nome) &&
      (!nome || f.nome === nome),
  );
if (!fontes.length)
  throw new Error("Fonte ativa não encontrada. Use FINEP, CNPq ou Embrapii.");
for (const fonte of fontes) {
  try {
    await coletaServico.coletar(fonte);
    console.log(`${fonte.nome}: concluída`);
  } catch (erro) {
    console.error(`${fonte.nome}:`, erro);
    process.exitCode = 1;
  }
}
