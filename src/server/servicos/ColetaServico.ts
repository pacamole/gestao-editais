import { transacao } from '../db/index.js'
import type { Fonte } from '../dominio/entidades.js'
import type { Repositorios } from '../repositorios/index.js'
import { baixar } from '../integracoes/http.js'
import { documentoPrincipal, PORTAIS, portalDaFonte, type PortalColeta } from './coleta/portais/index.js'
import type { RegistroDocumentoServico } from './RegistroDocumentoServico.js'

type RepositoriosColeta = Pick<Repositorios, 'fonte' | 'coletaExecucao'>

const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro))

// Percorre um portal: lista as chamadas abertas, baixa o PDF de cada uma e entrega ao registro.
// Cada execução fica anotada (sucesso, parcial ou falha) para o painel de saúde e o alerta E06.
export class ColetaServico {
  private readonly emExecucao = new Set<string>()

  constructor(
    private readonly repos: RepositoriosColeta,
    private readonly registro: RegistroDocumentoServico,
    private readonly portais: readonly PortalColeta[] = PORTAIS,
    private readonly baixarArquivo = baixar,
  ) {}

  async coletar(fonte: Fonte): Promise<void> {
    if (this.emExecucao.has(fonte.id)) return
    this.emExecucao.add(fonte.id)
    const execucao = this.repos.coletaExecucao.inserir({ fonte_id: fonte.id })
    let itens = 0
    let processados = 0
    const erros: string[] = []
    try {
      const portal = portalDaFonte(fonte.nome, this.portais)
      if (!portal || fonte.tipo !== 'SCRAPER') throw new Error('Fonte sem coletor automático.')

      const url = fonte.url_base ?? portal.urlPadrao
      const html = Buffer.from(await this.baixarArquivo(url)).toString('utf8')
      const publicacoes = portal.listarPublicacoes(html, url)
      if (!publicacoes.length) throw new Error('Nenhuma chamada identificada; confira a estrutura do portal.')

      for (const publicacao of publicacoes) {
        try {
          const detalhe = Buffer.from(await this.baixarArquivo(publicacao.url)).toString('utf8')
          const pdf = documentoPrincipal(detalhe, publicacao.url)
          if (!pdf) throw new Error('PDF principal não localizado; requer entrada manual.')

          const resultado = await this.registro.registrar(
            fonte,
            {
              titulo: publicacao.titulo,
              urlOriginal: publicacao.url,
              urlDocumento: pdf,
              numero: portal.numeroDaChamada(publicacao.titulo),
            },
            await this.baixarArquivo(pdf),
          )
          if (resultado !== 'DUPLICADO') itens++
          processados++
        } catch (erro) {
          erros.push(`${publicacao.url}: ${mensagem(erro)}`)
        }
      }
    } catch (erro) {
      erros.push(mensagem(erro))
    } finally {
      const status = erros.length ? (processados ? 'PARCIAL' : 'FALHA') : 'SUCESSO'
      const instante = new Date().toISOString()
      transacao(() => {
        this.repos.coletaExecucao.atualizar(execucao.id, {
          finalizada_em: instante,
          status,
          itens_coletados: itens,
          mensagem_erro: erros.join('\n') || null,
        })
        this.repos.fonte.atualizar(fonte.id, {
          ultima_coleta_em: instante,
          ultimo_status: status,
          ultima_mensagem_erro: erros.join('\n') || null,
        })
      })
      this.emExecucao.delete(fonte.id)
    }
    if (erros.length) throw new Error(erros.join('\n'))
  }
}
