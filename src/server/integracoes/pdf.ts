import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
// @ts-expect-error o pdfjs-dist não publica tipos para o worker
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { marcadorDePagina } from "../dominio/textoEdital.js";

// No Node o PDF.js roda o worker na mesma thread. Registrado aqui em vez de carregado pelo caminho
// do arquivo, que não existe em disco dentro do executável.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

export type PaginaPdf = { pagina: number; texto: string };
export type TextoPdf = {
  paginas: PaginaPdf[];
  texto: string;
  requerLeituraManual: boolean;
};

export function ehMarcadorDeTextoPdf(texto: string | null): boolean {
  return (
    texto !== null &&
    /^\[Texto extraído do documento PDF:[^\]\r\n]*\]$/.test(texto.trim())
  );
}

// PDF.js mantém a referência física de página e as quebras indicadas pelo documento.
// Sem OCR: documento com a maior parte das páginas sem camada de texto é encaminhado para leitura manual.
export async function extrairPdf(arquivo: Uint8Array): Promise<TextoPdf> {
  const tarefa = getDocument({
    data: new Uint8Array(arquivo),
    useSystemFonts: true,
  });
  try {
    const pdf = await tarefa.promise;
    const paginas: PaginaPdf[] = [];
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      const pagina = await pdf.getPage(numero);
      const conteudo = await pagina.getTextContent();
      const texto = conteudo.items
        .map((item) =>
          "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
        )
        .join("")
        .trim();
      paginas.push({ pagina: numero, texto });
      pagina.cleanup();
    }
    return {
      paginas,
      texto: paginas
        .map((p) => `${marcadorDePagina(p.pagina)}\n${p.texto}`)
        .join("\n\n"),
      // Só quando a maior parte do documento não tem texto; uma capa em imagem não impede a leitura.
      requerLeituraManual: paginas.filter((p) => !p.texto.trim()).length * 2 > paginas.length,
    };
  } finally {
    await tarefa.destroy();
  }
}
