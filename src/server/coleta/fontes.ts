import type { TipoFonte } from '../dominio/entidades.js'
import type { Repositorios } from '../repositorios/index.js'

export const FONTES_AUTOMATICAS = {
  FINEP: 'https://legacy.finep.gov.br/component/chamadas_publicas/chamadaspublicas',
  CNPq: 'https://www.gov.br/cnpq/pt-br/chamadas/Busca_abertas',
  Embrapii: 'https://embrapii.org.br/transparencia/#chamadas',
} as const
export type Portal = keyof typeof FONTES_AUTOMATICAS
const MANUAIS = ['BNDES', 'Fundação Araucária', 'Fomento Paraná', 'Copel', 'Diário Oficial do PR']

// Também serve para bases existentes; preserva configurações de fontes já instaladas.
export function cadastrarFontes(repos: Repositorios): void {
  for (const [nome, url] of Object.entries(FONTES_AUTOMATICAS)) {
    const existente = repos.fonte.buscarPorNome(nome)
    if (!existente) {
      repos.fonte.inserir({ nome, url_base: url, tipo: 'SCRAPER', ativo: true, frequencia_cron: '0 6 * * *' })
    } else if (!existente.url_base && !existente.frequencia_cron && !existente.ultima_coleta_em && existente.tipo === 'SCRAPER') {
      repos.fonte.atualizar(existente.id, { url_base: url, frequencia_cron: '0 6 * * *', ativo: true })
    }
  }
  for (const nome of MANUAIS) {
    const existente = repos.fonte.buscarPorNome(nome)
    if (!existente) repos.fonte.inserir({ nome, tipo: 'URL_MANUAL', ativo: true })
    else if (existente.tipo === 'SCRAPER' && !existente.url_base && !existente.ultima_coleta_em) repos.fonte.atualizar(existente.id, { tipo: 'URL_MANUAL', ativo: true })
  }
}

export const fontesIniciais: { nome: string; tipo: TipoFonte; ativo: boolean; url_base?: string; frequencia_cron?: string }[] = [
  { nome: 'Upload manual', tipo: 'UPLOAD_MANUAL', ativo: true },
  { nome: 'URL manual', tipo: 'URL_MANUAL', ativo: true },
  ...Object.entries(FONTES_AUTOMATICAS).map(([nome, url_base]) => ({ nome, url_base, tipo: 'SCRAPER' as const, ativo: true, frequencia_cron: '0 6 * * *' })),
  ...MANUAIS.map((nome) => ({ nome, tipo: 'URL_MANUAL' as const, ativo: true })),
]
