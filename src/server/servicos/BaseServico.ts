import type {
  ConexaoBase,
  ConectarNuvemEntrada,
  ListaBackupsResposta,
  ResumoBaseResposta,
  TesteNuvemEntrada,
  TesteNuvemResposta,
  TrocaBaseResposta,
} from '../../shared/api.js'
import { BaseRepositorio, ErroImportacao } from '../repositorios/BaseRepositorio.js'
import { abrirLocal, abrirRemota, lerConfigConexao } from '../db/conexao.js'
import { db, estadoBase, trocarBase } from '../db/index.js'
import { ErroNaoEncontrado, ErroRegraNegocio, ErroServicoExterno, ErroValidacao } from '../dominio/erros.js'

// libsql:// é o formato do Turso; http(s):// serve para um servidor libSQL próprio.
const URL_NUVEM = /^(libsql|https?):\/\/[^\s/]+/

function lerNuvem(corpo: unknown): TesteNuvemEntrada {
  const { url, token } = (corpo ?? {}) as Record<string, unknown>
  const dados = { url: String(url ?? '').trim(), token: String(token ?? '').trim() }
  if (!URL_NUVEM.test(dados.url) || !dados.token) {
    throw new ErroValidacao('Informe a URL do banco (libsql://… ou https://…) e o token.')
  }
  return dados
}

const conexaoAtual = (): ConexaoBase => estadoBase()

// Administração da base de dados: backups, importação, exportação e troca entre base local e na nuvem (Turso).
export class BaseServico {
  constructor(
    private readonly baseDados: BaseRepositorio,
    /** Pasta onde "Exportar base" grava os arquivos .db. */
    readonly pastaExportacoes: string,
  ) {}

  nomeExportacao(): string {
    return `editais-${BaseRepositorio.carimbo()}.db`
  }

  resumo(): ResumoBaseResposta {
    return { ...this.baseDados.resumo(), conexao: conexaoAtual() }
  }

  listarBackups(): ListaBackupsResposta {
    return { backups: this.baseDados.listarBackups() }
  }

  caminhoBackup(nome: string): string {
    const caminho = this.baseDados.caminhoBackup(nome)
    if (!caminho) throw new ErroNaoEncontrado('Backup não encontrado.')
    return caminho
  }

  exportarPara(arquivo: string) {
    return this.baseDados.exportar(arquivo)
  }

  importarDe(arquivo: string) {
    return this.traduzirErroImportacao(() => this.baseDados.importar(arquivo))
  }

  /** Volta a base para um backup; o estado atual vira um novo backup antes. */
  restaurar(nome: string) {
    return this.traduzirErroImportacao(() => this.baseDados.restaurar(nome))
  }

  /** Abre a base na nuvem, analisa e fecha. Erros de rede e de token viram situações, não exceções. */
  testarNuvem(corpo: unknown): TesteNuvemResposta {
    return this.analisarNuvem(lerNuvem(corpo))
  }

  /**
   * Passa a usar a base na nuvem. Se ela estiver vazia, cria a estrutura e (opcional) envia os dados locais.
   * A base deste computador não é alterada: dá para voltar a ela depois.
   */
  conectarNuvem(corpo: unknown): TrocaBaseResposta {
    const nuvem = lerNuvem(corpo)
    const { enviarDadosLocais } = (corpo ?? {}) as ConectarNuvemEntrada

    const teste = this.analisarNuvem(nuvem)
    if (teste.situacao === 'TOKEN_RECUSADO') throw new ErroValidacao('O Turso recusou o token.')
    if (teste.situacao === 'SEM_CONEXAO') throw new ErroServicoExterno(`Sem conexão com a base na nuvem: ${teste.mensagem}`)
    if (teste.situacao === 'SCHEMA_DIFERENTE') throw new ErroValidacao('A base na nuvem foi criada por outra versão do sistema.')

    if (teste.situacao === 'VAZIA') {
      const remota = abrirRemota(nuvem.url, nuvem.token)
      // Dados locais: a base em uso, se for a local; senão, o arquivo local guardado.
      const local = enviarDadosLocais ? (estadoBase().modo === 'LOCAL' ? db : abrirLocal()) : null
      try {
        this.baseDados.prepararNuvem(remota, local)
      } finally {
        remota.close()
        if (local && local !== db) (local as { close(): void }).close()
      }
    }
    trocarBase({ modo: 'NUVEM', url: nuvem.url, token: nuvem.token })
    return { ok: true, conexao: conexaoAtual() }
  }

  /** Tenta de novo a base na nuvem salva (quando ela não abriu e o sistema seguiu com a local). */
  reconectarNuvem(): TrocaBaseResposta {
    const config = lerConfigConexao()
    if (config.modo !== 'NUVEM') throw new ErroRegraNegocio('Nenhuma base na nuvem configurada.')
    try {
      trocarBase(config)
    } catch (erro) {
      console.error('Reconectar à base na nuvem falhou:', erro)
      throw new ErroServicoExterno('Ainda sem conexão com a base na nuvem. Confira a internet e tente de novo.')
    }
    return { ok: true, conexao: conexaoAtual() }
  }

  /** Volta a usar a base deste computador. A base na nuvem continua lá, intacta. */
  usarLocal(): TrocaBaseResposta {
    trocarBase({ modo: 'LOCAL', url: '', token: '' })
    return { ok: true, conexao: conexaoAtual() }
  }

  // Arquivo inválido ou de outro schema: erro do pedido, não do servidor.
  private traduzirErroImportacao<T>(operacao: () => T): T {
    try {
      return operacao()
    } catch (erro) {
      throw erro instanceof ErroImportacao ? new ErroValidacao(erro.message) : erro
    }
  }

  private analisarNuvem({ url, token }: TesteNuvemEntrada): TesteNuvemResposta {
    let remota
    try {
      remota = abrirRemota(url, token)
      const analise = this.baseDados.analisarNuvem(remota)
      return analise.situacao === 'COM_DADOS'
        ? { situacao: 'COM_DADOS', tabelas: analise.tabelas }
        : analise.situacao === 'SCHEMA_DIFERENTE'
          ? { situacao: 'SCHEMA_DIFERENTE', diferencas: analise.diferencas }
          : { situacao: 'VAZIA' }
    } catch (erro) {
      const mensagem = (erro as Error).message ?? String(erro)
      if (/401|403|unauthori[sz]ed|forbidden|auth/i.test(mensagem)) return { situacao: 'TOKEN_RECUSADO' }
      return { situacao: 'SEM_CONEXAO', mensagem }
    } finally {
      remota?.close()
    }
  }
}
