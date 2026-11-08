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
import { CAMPOS_EDITAVEIS, MARCADOR_DADO_ESTRUTURADO, MARCADOR_EDICAO_MANUAL } from '../../../shared/camposEditaveis'
import { CAMPOS_EDITAL, MODALIDADES } from '../../../shared/rotulos'
import { NAO_LOCALIZADO, SEM_CONEXAO, type AoErro } from './util'

// Linha da tabela: rótulo, campo do edital (os links são só exibição) e valor já formatado.
type CampoLink = 'url_documento' | 'url_origem'
type Linha = [nome: string, campo: CampoEditavel | CampoLink, valor: unknown]
const ehLink = (campo: string): campo is CampoLink => campo === 'url_documento' || campo === 'url_origem'

// Texto curto do link: o nome do arquivo, num PDF; senão o endereço sem "https://". O endereço completo fica no link.
function textoDoLink(url: string): string {
  try {
    const endereco = new URL(url)
    const arquivo = decodeURIComponent(endereco.pathname.split('/').find((parte) => /\.pdf$/i.test(parte)) ?? '').replace(/\+/g, ' ')
    return arquivo || `${endereco.hostname}${endereco.pathname}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

// Valor como aparece na tabela: datas e moedas formatadas, o resto como veio.
function valorExibido(campo: CampoEditavel, valor: unknown): unknown {
  switch (CAMPOS_EDITAL[campo].tipo) {
    case 'data':
      return formatarData(valor as string | null, NAO_LOCALIZADO)
    case 'moeda':
      return formatarMoeda(valor as number | null, NAO_LOCALIZADO)
    case 'booleano':
      return rotuloValor(valor as boolean | null, NAO_LOCALIZADO)
    default:
      return valor
  }
}

// A tabela e o editor saem do catálogo de campos: campo novo no catálogo aparece aqui sozinho.
function linhasDoEdital(e: EditalDetalhado): Linha[] {
  return [
    // O documento do edital (PDF) e a página onde ele foi encontrado; quando são o mesmo endereço, uma linha só.
    ['Documento do edital', 'url_documento', e.url_documento],
    ...(e.url_original && e.url_original !== e.url_documento ? [['Página de origem', 'url_origem', e.url_original] as Linha] : []),
    ...CAMPOS_EDITAVEIS.map((campo): Linha => [CAMPOS_EDITAL[campo].rotulo, campo, valorExibido(campo, e[campo])]),
  ]
}

const camposEditaveis = (linhas: Linha[]) =>
  linhas.map(([, campo]) => campo).filter((campo): campo is CampoEditavel => !ehLink(campo))

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
      // Com o documento já lido (PDF ou texto da fonte), a IA usa esse texto. Ler a página só serve quando não há
      // texto: em fontes como a FINEP o endereço é a lista de chamadas, que não descreve o edital.
      const r = textoDisponivel ? await apiEdital.extrairDados(id) : await apiEdital.lerUrl(id)
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
            : CAMPOS_EDITAL[campo].tipo === 'data'
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
      } else {
        const tipo = CAMPOS_EDITAL[campo].tipo
        valores[campo] =
          tipo === 'booleano'
            ? texto === 'true'
            : tipo === 'moeda' || tipo === 'percentual' || tipo === 'inteiro'
              ? Number(texto)
              : tipo === 'lista'
                ? texto.split(',').map((item) => item.trim()).filter(Boolean)
                : texto.trim()
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

  // Campo de edição adequado ao tipo do campo (definido no catálogo).
  function editor(campo: CampoEditavel) {
    const valor = rascunhoCampos[campo] ?? ''
    const alterar = (novo: string) => setRascunhoCampos({ ...rascunhoCampos, [campo]: novo })
    const tipo = CAMPOS_EDITAL[campo].tipo

    switch (tipo) {
      case 'modalidade':
        return (
          <select className="input" value={valor} onChange={(evento) => alterar(evento.target.value)}>
            <option value="">Não localizado</option>
            {Object.entries(MODALIDADES).map(([codigo, rotulo]) => (
              <option key={codigo} value={codigo}>{rotulo}</option>
            ))}
          </select>
        )
      case 'booleano':
        return (
          <select className="input" value={valor} onChange={(evento) => alterar(evento.target.value)}>
            <option value="">Não localizado</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        )
      case 'data':
        return <input className="input" type="date" value={valor} onChange={(evento) => alterar(evento.target.value)} />
      case 'moeda':
      case 'percentual':
      case 'inteiro':
        return (
          <input
            className="input"
            type="number"
            min="0"
            max={tipo === 'percentual' ? 100 : undefined}
            step={tipo === 'inteiro' ? 1 : 'any'}
            value={valor}
            onChange={(evento) => alterar(evento.target.value)}
          />
        )
      case 'lista':
        return <textarea className="textarea" rows={2} value={valor} onChange={(evento) => alterar(evento.target.value)} />
      default:
        return campo === 'resumo_executivo' ? (
          <textarea className="textarea" rows={3} value={valor} onChange={(evento) => alterar(evento.target.value)} />
        ) : (
          <input className="input" value={valor} onChange={(evento) => alterar(evento.target.value)} />
        )
    }
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
                {lendoConteudo ? 'Analisando edital...' : 'Fazer análise profunda'}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="card__corpo card__corpo--justo">
        {editandoCampos && (
          <p className="discreto">
            Edite os valores. Para listas, separe os itens por vírgulas; deixe vazio para marcar como não localizado.
          </p>
        )}
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
                    {editandoCampos && !ehLink(campo) ? (
                      editor(campo)
                    ) : ehLink(campo) && typeof valor === 'string' && /^https?:\/\//i.test(valor) ? (
                      <a href={valor} target="_blank" rel="noopener noreferrer" className="link-truncado" title={valor}>
                        {textoDoLink(valor)}
                      </a>
                    ) : rotuloValor(valor, NAO_LOCALIZADO)}
                  </td>
                  <td>
                    {ev?.trecho_literal === MARCADOR_EDICAO_MANUAL ? (
                      <span className="discreto">Editado manualmente</span>
                    ) : ev?.trecho_literal === MARCADOR_DADO_ESTRUTURADO ? (
                      <span className="discreto">Informado pela fonte</span>
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
