import "../config/env.js";
import { editalServico, processamentoEditalServico } from "../composicao.js";

// Relê com a IA os editais já analisados (só preenche campos vazios) e os reavalia, sem enviar e-mails.
// Depois encerra os que ficaram com prazo vencido.
const relidos = await processamentoEditalServico.relerAnalisados((edital, resultado) => {
  const titulo = edital.titulo.slice(0, 70);
  if (resultado instanceof Error) {
    console.error(`FALHOU  ${titulo}: ${resultado.message}`);
    process.exitCode = 1;
  } else {
    console.log(`${String(resultado.atualizados).padStart(2)} campo(s)  ${titulo}${resultado.campos.length ? ` (${resultado.campos.join(", ")})` : ""}`);
  }
});
const expirados = editalServico.expirarVencidos();
console.log(`\n${relidos} edital(is) relido(s); ${expirados} expirado(s) por prazo vencido.`);
