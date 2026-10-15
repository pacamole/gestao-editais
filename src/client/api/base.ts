import type { ListaBackupsResposta, ResultadoImportacao, ResumoBase } from '../../shared/api'
import { ErroApi, irParaLogin, requisicao } from './cliente'

export const base = {
  // Link direto de download (usado como href).
  urlExportar: '/api/base/exportar',

  resumo: () => requisicao<ResumoBase>('/api/base/resumo'),

  backups: () => requisicao<ListaBackupsResposta>('/api/base/backups'),

  urlBackup: (nome: string) => `/api/base/backups/${encodeURIComponent(nome)}`,

  // Sessões são apagadas: depois disso todos entram de novo.
  restaurar: (nome: string) =>
    requisicao<ResultadoImportacao>(`/api/base/backups/${encodeURIComponent(nome)}/restaurar`, {
      metodo: 'POST',
      redirecionarSe401: false,
    }),

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
