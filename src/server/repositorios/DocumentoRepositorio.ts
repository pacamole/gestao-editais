import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { arquivoBanco } from '../config/paths.js'

// Guarda os PDFs dos editais em arquivos, ao lado do banco, nomeados pelo hash do conteúdo.
// Não é uma tabela, por isso não herda de Repositorio.
export class DocumentoRepositorio {
  constructor(private readonly pasta = path.join(path.dirname(arquivoBanco), 'documentos')) {}

  async salvarPdf(hash: string, conteudo: Uint8Array): Promise<void> {
    await mkdir(this.pasta, { recursive: true })
    await writeFile(path.join(this.pasta, `${hash}.pdf`), conteudo)
  }
}
