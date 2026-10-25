import type { ColetaServico } from './ColetaServico.js'
import { FONTES_ENTRADA_MANUAL, FONTES_MANUAIS, FREQUENCIA_COLETA_PADRAO } from './coleta/fontesPadrao.js'
import { PORTAIS } from './coleta/portais/index.js'
import { novoId } from '../db/index.js'
import { ErroNaoEncontrado, ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import type { FonteResposta, ListaFontesResposta, TipoFonte } from '../../shared/tipos/fontes.js'

type RepositoriosFonte = Pick<Repositorios, 'fonte' | 'coletaExecucao'>

const TIPOS_FONTE: readonly TipoFonte[] = ['SCRAPER', 'RSS', 'UPLOAD_MANUAL', 'URL_MANUAL']
const EXECUCOES_NA_LISTA = 10

const opcional = (valor: unknown): string | null => (valor == null || valor === '' ? null : String(valor))

// Fontes de editais (portais e entradas manuais) e a coleta sob demanda.
export class FonteServico {
  constructor(
    private readonly repos: RepositoriosFonte,
    private readonly coleta: ColetaServico,
  ) {}

  /**
   * Garante as fontes padrão (portais com coletor e fontes manuais) em bases que já existem,
   * sem mexer na configuração que o usuário já fez.
   */
  garantirFontesPadrao(): void {
    // As entradas manuais (upload e link) precisam de uma fonte própria para identificar a origem.
    for (const { nome, tipo } of FONTES_ENTRADA_MANUAL) {
      if (!this.repos.fonte.buscarPorNome(nome)) this.repos.fonte.inserir({ nome, tipo, ativo: true })
    }
    for (const portal of PORTAIS) {
      const existente = this.repos.fonte.buscarPorNome(portal.nome)
      if (!existente) {
        this.repos.fonte.inserir({
          nome: portal.nome,
          url_base: portal.urlPadrao,
          tipo: 'SCRAPER',
          ativo: true,
          frequencia_cron: FREQUENCIA_COLETA_PADRAO,
        })
      } else if (
        !existente.url_base &&
        !existente.frequencia_cron &&
        !existente.ultima_coleta_em &&
        existente.tipo === 'SCRAPER'
      ) {
        this.repos.fonte.atualizar(existente.id, {
          url_base: portal.urlPadrao,
          frequencia_cron: FREQUENCIA_COLETA_PADRAO,
          ativo: true,
        })
      }
    }
    for (const nome of FONTES_MANUAIS) {
      const existente = this.repos.fonte.buscarPorNome(nome)
      if (!existente) this.repos.fonte.inserir({ nome, tipo: 'URL_MANUAL', ativo: true })
      else if (existente.tipo === 'SCRAPER' && !existente.url_base && !existente.ultima_coleta_em) {
        this.repos.fonte.atualizar(existente.id, { tipo: 'URL_MANUAL', ativo: true })
      }
    }
  }

  listar(): ListaFontesResposta {
    return {
      fontes: this.repos.fonte.listar().map((fonte) => ({
        ...fonte,
        execucoes: this.repos.coletaExecucao.ultimasDaFonte(fonte.id, EXECUCOES_NA_LISTA),
      })),
    }
  }

  salvar(dados: Record<string, unknown>): FonteResposta {
    const tipo = String(dados.tipo ?? 'URL_MANUAL') as TipoFonte
    if (!TIPOS_FONTE.includes(tipo)) throw new ErroValidacao('Tipo de fonte inválido.')

    const nome = String(dados.nome ?? '').trim()
    if (!nome) throw new ErroValidacao('Nome da fonte é obrigatório.')

    const registro = {
      id: dados.id ? String(dados.id) : novoId(),
      nome,
      url_base: opcional(dados.url_base),
      tipo,
      frequencia_cron: opcional(dados.frequencia_cron),
      ativo: dados.ativo !== false,
    }
    const existente = this.repos.fonte.buscarPorId(registro.id)
    const salva = existente ? this.repos.fonte.atualizar(registro.id, registro) : this.repos.fonte.inserir(registro)
    return { ok: true, fonte: salva! }
  }

  alternarAtivo(id: string): FonteResposta {
    const fonte = this.buscar(id)
    return { ok: true, fonte: this.repos.fonte.atualizar(fonte.id, { ativo: !fonte.ativo })! }
  }

  async coletar(id: string): Promise<FonteResposta> {
    const fonte = this.buscar(id)
    try {
      await this.coleta.coletar(fonte)
    } catch (erro) {
      throw new ErroServicoExterno(erro instanceof Error && erro.message ? erro.message : 'Falha ao disparar a coleta.')
    }
    return { ok: true, fonte: this.repos.fonte.buscarPorId(fonte.id)! }
  }

  private buscar(id: string) {
    const fonte = this.repos.fonte.buscarPorId(id)
    if (!fonte) throw new ErroNaoEncontrado('Fonte não encontrada.')
    return fonte
  }
}
