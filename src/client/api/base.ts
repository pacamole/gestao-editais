import type { ResultadoImportacao } from '../../shared/api'
import { ErroApi, irParaLogin } from './cliente'

export const base = {
  // Link direto de download (usado como href).
  urlExportar: '/api/base/exportar',

  // O arquivo .db vai cru no corpo (application/octet-stream), não em JSON.
  async importar(arquivo: File): Promise<ResultadoImportacao> {
    const resposta = await fetch('/api/base/importar', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: arquivo,
    })
    if (!resposta.ok) {
      const dados: unknown = await resposta.json().catch(() => null)
      if (resposta.status === 401) irParaLogin()
      const mensagem =
        dados && typeof dados === 'object' && 'erro' in dados && typeof dados.erro === 'string'
          ? dados.erro
          : `Falha na requisição (${resposta.status}).`
      throw new ErroApi(mensagem, resposta.status, dados)
    }

    return (await resposta.json()) as ResultadoImportacao
  },
}
