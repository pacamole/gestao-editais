import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export type PaginaPdf = { pagina: number; texto: string }
export type TextoPdf = { paginas: PaginaPdf[]; texto: string; requerLeituraManual: boolean }

// PDF.js mantém a referência física de página e as quebras indicadas pelo documento.
// Sem OCR: páginas sem camada de texto são encaminhadas para leitura manual.
export async function extrairPdf(arquivo: Uint8Array): Promise<TextoPdf> {
  const tarefa = getDocument({ data: new Uint8Array(arquivo), useSystemFonts: true })
  try {
    const pdf = await tarefa.promise
    const paginas: PaginaPdf[] = []
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      const pagina = await pdf.getPage(numero)
      const conteudo = await pagina.getTextContent()
      const texto = conteudo.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim()
      paginas.push({ pagina: numero, texto })
      pagina.cleanup()
    }
    return {
      paginas,
      texto: paginas.map((p) => `[Página ${p.pagina}]\n${p.texto}`).join('\n\n'),
      requerLeituraManual: paginas.some((p) => !p.texto.trim()),
    }
  } finally {
    await tarefa.destroy()
  }
}
