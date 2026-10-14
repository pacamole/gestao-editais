import { useState } from 'react'
import { ErroApi, mensagemDeErro } from '../../api/cliente'
import { edital as apiEdital } from '../../api/edital'
import { formatarData, formatarMoeda, rotuloValor } from '../../util/formato'
import type {
  CampoEditavel,
  EditalDetalhado,
  ErroLerUrlDados,
  Evidencia,
  ValorCampoEditavel,
} from '../../../shared/tipos/edital'
import { MARCADOR_EDICAO_MANUAL } from '../../../shared/camposEditaveis'
import { NAO_LOCALIZADO, SEM_CONEXAO, type AoErro } from './util'

// Linha da tabela: rótulo, campo do edital (url_origem é só exibição) e valor já formatado.
type Linha = [nome: string, campo: CampoEditavel | 'url_origem', valor: unknown]

const CAMPOS_NUMERICOS: CampoEditavel[] = ['valor_total_disponivel', 'valor_maximo_por_projeto', 'percentual_contrapartida']
const CAMPOS_LISTA: CampoEditavel[] = ['publico_alvo', 'cnaes_aceitos', 'portes_aceitos', 'abrangencia_geografica', 'areas_tematicas']

const ehCampoData = (campo: string) => campo.startsWith('data_') || campo === 'prazo_inscricao'

function linhasDoEdital(e: EditalDetalhado): Linha[] {
  return [
    ['URL de origem', 'url_origem', e.url_original || e.url_documento],
    ['Órgão financiador', 'orgao_financiador', e.orgao_financiador],
    ['Número', 'numero_edital', e.numero_edital],
    ['Modalidade', 'modalidade', e.modalidade],
    ['Publicação', 'data_publicacao', formatarData(e.data_publicacao, NAO_LOCALIZADO)],
    ['Prazo', 'prazo_inscricao', formatarData(e.prazo_inscricao, NAO_LOCALIZADO)],
    ['Valor total', 'valor_total_disponivel', formatarMoeda(e.valor_total_disponivel, NAO_LOCALIZADO)],
    ['Valor máximo/projeto', 'valor_maximo_por_projeto', formatarMoeda(e.valor_maximo_por_projeto, NAO_LOCALIZADO)],
    ['Exige contrapartida', 'exige_contrapartida', rotuloValor(e.exige_contrapartida, NAO_LOCALIZADO)],
    ['Contrapartida (%)', 'percentual_contrapartida', e.percentual_contrapartida],
    ['Público-alvo', 'publico_alvo', e.publico_alvo],
    ['CNAEs aceitos', 'cnaes_aceitos', e.cnaes_aceitos],
    ['Portes aceitos', 'portes_aceitos', e.portes_aceitos],
    ['Abrangência', 'abrangencia_geografica', e.abrangencia_geografica],
    ['Áreas temáticas', 'areas_tematicas', e.areas_tematicas],
    ['Resumo executivo', 'resumo_executivo', e.resumo_executivo],
  ]
}

const camposEditaveis = (linhas: Linha[]) =>
  linhas.map(([, campo]) => campo).filter((campo): campo is CampoEditavel => campo !== 'url_origem')

type Props = {
  id: string
  edital: EditalDetalhado
  evidencias: Evidencia[]
  textoDisponivel: boolean
  aoErro: AoErro
  aoAtualizar: () => Promise<void>
}

export function DadosExtraidos({ id, edital: e, evidencias, textoDisponivel, aoErro, aoAtualizar }: Props) {
  const [lendoConteudo, setLendoConteudo] = useState(false)
  const [feedbackExtracao, setFeedbackExtracao] = useState('')
  const [editandoCampos, setEditandoCampos] = useState(false)
  const [salvandoCampos, setSalvandoCampos] = useState(false)
  const [rascunhoCampos, setRascunhoCampos] = useState<Record<string, string>>({})
  const [camposOriginaisEdicao, setCamposOriginaisEdicao] = useState<Record<string, string>>({})

  const linhas = linhasDoEdital(e)
  const temUrl = Boolean(e.url_original || e.url_documento)

  async function lerConteudo() {
    if (lendoConteudo) return
    setLendoConteudo(true)
    aoErro('')
    setFeedbackExtracao('')
    try {
      const r = temUrl ? await apiEdital.lerUrl(id) : await apiEdital.extrairDados(id)
      setFeedbackExtracao(r.mensagem ?? 'Leitura e extração concluídas.')
      await aoAtualizar()
    } catch (erroLeitura) {
      // A página pode ter sido salva mesmo com a extração falhando.
      if (erroLeitura instanceof ErroApi && (erroLeitura.dados as ErroLerUrlDados | null)?.textoSalvo) {
        await aoAtualizar()
      }
      aoErro(mensagemDeErro(erroLeitura, SEM_CONEXAO))
    } finally {
      setLendoConteudo(false)
    }
  }

  function iniciarEdicaoCampos() {
    const rascunho: Record<string, string> = {}
    for (const campo of camposEditaveis(linhas)) {
      const valor = e[campo]
      rascunho[campo] = valor == null
        ? ''
        : Array.isArray(valor)
          ? valor.join(', ')
          : typeof valor === 'boolean'
            ? String(valor)
            : ehCampoData(campo)
              ? String(valor).slice(0, 10)
              : String(valor)
    }
    setRascunhoCampos(rascunho)
    setCamposOriginaisEdicao(rascunho)
    setEditandoCampos(true)
    aoErro('')
  }

  async function salvarCamposManuais() {
    if (salvandoCampos) return
    setSalvandoCampos(true)
    aoErro('')
    const valores: Partial<Record<CampoEditavel, ValorCampoEditavel>> = {}
    for (const campo of camposEditaveis(linhas)) {
      const texto = rascunhoCampos[campo] ?? ''
      if (texto === (camposOriginaisEdicao[campo] ?? '')) continue
      if (!texto.trim()) {
        valores[campo] = null
      } else if (campo === 'exige_contrapartida') {
        valores[campo] = texto === 'true'
      } else if (CAMPOS_NUMERICOS.includes(campo)) {
        valores[campo] = Number(texto)
      } else if (CAMPOS_LISTA.includes(campo)) {
        valores[campo] = texto.split(',').map((item) => item.trim()).filter(Boolean)
      } else {
        valores[campo] = texto.trim()
      }
    }

    try {
      if (!Object.keys(valores).length) {
        setEditandoCampos(false)
        setFeedbackExtracao('Nenhum campo foi alterado.')
        return
      }
      const r = await apiEdital.salvarCampos(id, valores)
      setFeedbackExtracao(r.mensagem ?? 'Dados atualizados manualmente.')
      setEditandoCampos(false)
      await aoAtualizar()
    } catch (erroSalvar) {
      aoErro(mensagemDeErro(erroSalvar, SEM_CONEXAO))
    } finally {
      setSalvandoCampos(false)
    }
  }

  // Campo de edição adequado ao tipo do campo.
  function editor(campo: CampoEditavel) {
    const valor = rascunhoCampos[campo] ?? ''
    const alterar = (novo: string) => setRascunhoCampos({ ...rascunhoCampos, [campo]: novo })

    if (campo === 'resumo_executivo') {
      return <textarea className="textarea" rows={3} value={valor} onChange={(evento) => alterar(evento.target.value)} />
    }
    if (campo === 'modalidade') {
      return (
        <select className="input" value={valor} onChange={(evento) => alterar(evento.target.value)}>
          <option value="">Não localizado</option>
          <option value="SUBVENCAO">Subvenção</option>
          <option value="CREDITO">Crédito</option>
          <option value="PREMIO">Prêmio</option>
          <option value="LICITACAO">Licitação</option>
          <option value="CHAMADA_PUBLICA">Chamada pública</option>
          <option value="OUTRO">Outro</option>
        </select>
      )
    }
    if (campo === 'exige_contrapartida') {
      return (
        <select className="input" value={valor} onChange={(evento) => alterar(evento.target.value)}>
          <option value="">Não localizado</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      )
    }
    if (ehCampoData(campo)) {
      return <input className="input" type="date" value={valor} onChange={(evento) => alterar(evento.target.value)} />
    }
    if (CAMPOS_NUMERICOS.includes(campo)) {
      return (
        <input
          className="input"
          type="number"
          min="0"
          max={campo === 'percentual_contrapartida' ? 100 : undefined}
          step="any"
          value={valor}
          onChange={(evento) => alterar(evento.target.value)}
        />
      )
    }
    if (CAMPOS_LISTA.includes(campo)) {
      return <textarea className="textarea" rows={2} value={valor} onChange={(evento) => alterar(evento.target.value)} />
    }
    return <input className="input" value={valor} onChange={(evento) => alterar(evento.target.value)} />
  }

  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho">
        <h2>Dados extraídos</h2>
        <div className="linha" style={{ gap: 'var(--esp-2)' }}>
          {editandoCampos ? (
            <>
              <button type="button" className="btn btn--sucesso" onClick={salvarCamposManuais} disabled={salvandoCampos}>
                {salvandoCampos ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" className="btn" onClick={() => setEditandoCampos(false)} disabled={salvandoCampos}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={iniciarEdicaoCampos}>
                Editar dados
              </button>
              <button
                type="button"
                className="btn"
                onClick={lerConteudo}
                disabled={lendoConteudo || (!temUrl && !textoDisponivel)}
                title={!temUrl && !textoDisponivel ? 'Este edital ainda não tem URL nem texto extraído.' : undefined}
              >
                {lendoConteudo ? 'Lendo conteúdo e extraindo...' : 'Ler edital com IA'}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="card__corpo card__corpo--justo">
        <p className="discreto">
          {editandoCampos
            ? 'Edite os valores. Para listas, separe os itens por vírgulas; deixe vazio para marcar como não localizado.'
            : 'Lê a página pública cadastrada ou analisa o texto do PDF já extraído. A IA preenche apenas campos vazios e exibe o trecho que comprova cada valor. Você também pode corrigir os dados manualmente.'}
        </p>
        {feedbackExtracao && <p role="status" className="discreto">{feedbackExtracao}</p>}
        <table className="tabela">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor</th>
              <th>Evidência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([nome, campo, valor]) => {
              const ev = evidencias.find((x) => x.campo === campo)
              return (
                <tr key={campo}>
                  <td>
                    <strong>{nome}</strong>
                  </td>
                  <td>
                    {editandoCampos && campo !== 'url_origem' ? (
                      editor(campo)
                    ) : campo === 'url_origem' && typeof valor === 'string' && /^https?:\/\//i.test(valor) ? (
                      <a href={valor} target="_blank" rel="noopener noreferrer">{valor}</a>
                    ) : rotuloValor(valor, NAO_LOCALIZADO)}
                  </td>
                  <td>
                    {ev?.trecho_literal === MARCADOR_EDICAO_MANUAL ? (
                      <span className="discreto">Editado manualmente</span>
                    ) : ev ? (
                      <details>
                        <summary className="discreto">Ver trecho</summary>
                        <p style={{ marginTop: 4, fontStyle: 'italic' }}>
                          “{ev.trecho_literal}”{' '}
                          {ev.pagina ? `— pág. ${ev.pagina}` : ''}
                        </p>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
