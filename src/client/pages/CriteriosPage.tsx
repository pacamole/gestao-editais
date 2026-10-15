import { useEffect, useState, type CSSProperties } from 'react'
import type { Criterio, Operador, ResultadoSimulacao, TipoCriterio } from '../../shared/tipos/criterios'
import {
  CAMPOS_CRITERIO_EDITAL,
  CAMPOS_CRITERIO_PERFIL,
  OPERADORES,
  camposPerfilCompativeis,
  operadoresDoCampo,
} from '../../shared/catalogoCriterios'
import { criterios, type EditalParaSimulacao } from '../api/criterios'
import { mensagemDeErro } from '../api/cliente'

// Estado do formulário: campos opcionais e peso como texto editável; id '' = novo.
type FormCriterio = {
  id: string
  nome: string
  tipo: TipoCriterio
  campo_edital: string
  campo_perfil: string
  operador: Operador
  valor_referencia: string
  peso: string
  mensagem_reprovacao: string
  ativo: boolean
  ordem: number
}

const criterioInicial: FormCriterio = {
  id: '',
  nome: '',
  tipo: 'ELIMINATORIO',
  campo_edital: '',
  campo_perfil: '',
  operador: 'LISTA_VAZIA_OU_CONTEM',
  valor_referencia: '',
  peso: '1',
  mensagem_reprovacao: '',
  ativo: true,
  ordem: 0,
}

function paraFormulario(c: Criterio): FormCriterio {
  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    campo_edital: c.campo_edital,
    campo_perfil: c.campo_perfil ?? '',
    operador: c.operador,
    valor_referencia: c.valor_referencia ?? '',
    peso: c.peso == null ? '' : String(c.peso),
    mensagem_reprovacao: c.mensagem_reprovacao ?? '',
    ativo: c.ativo,
    ordem: c.ordem,
  }
}

const rotuloEdital = (campo: string) => CAMPOS_CRITERIO_EDITAL[campo]?.rotulo ?? campo
const rotuloPerfil = (campo: string) => CAMPOS_CRITERIO_PERFIL[campo]?.rotulo ?? campo

// Frase legível do critério: "Prazo de inscrição é maior ou igual a Data atual".
function descreverRegra(c: Criterio): string {
  const referencia = c.campo_perfil ? rotuloPerfil(c.campo_perfil) : c.valor_referencia ? `"${c.valor_referencia}"` : ''
  return [rotuloEdital(c.campo_edital), OPERADORES[c.operador], referencia].filter(Boolean).join(' ')
}

export function CriteriosPage() {
  const [eliminatorios, setEliminatorios] = useState<Criterio[]>([])
  const [pontuaveis, setPontuaveis] = useState<Criterio[]>([])
  const [editalId, setEditalId] = useState('')
  const [editais, setEditais] = useState<EditalParaSimulacao[]>([])
  const [form, setForm] = useState(criterioInicial)
  const [simulacao, setSimulacao] = useState<ResultadoSimulacao | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  async function carregar() {
    try {
      const [crit, lista] = await Promise.all([criterios.listar(), criterios.editaisParaSimulacao()])
      setEliminatorios(crit.eliminatorios ?? [])
      setPontuaveis(crit.pontuaveis ?? [])
      setEditais(lista)
      if (!editalId && lista[0]?.id) setEditalId(lista[0].id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar os critérios.'))
    }
  }

  useEffect(() => { carregar() }, [])

  function atualizarCampo<K extends keyof FormCriterio>(campo: K, valor: FormCriterio[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  // Trocar o campo do edital descarta operador e referência incompatíveis com o novo tipo.
  function trocarCampoEdital(campoEdital: string) {
    setForm((atual) => {
      const operadores = operadoresDoCampo(campoEdital)
      return {
        ...atual,
        campo_edital: campoEdital,
        operador: operadores.includes(atual.operador) ? atual.operador : (operadores[0] ?? atual.operador),
        campo_perfil: camposPerfilCompativeis(campoEdital).includes(atual.campo_perfil) ? atual.campo_perfil : '',
      }
    })
  }

  function limpar() {
    setForm(criterioInicial)
  }

  // Executa uma ação, limpando avisos antes e mostrando o erro se falhar.
  async function executar(acao: () => Promise<void>, padraoErro: string) {
    setMensagem('')
    setErro('')
    try {
      await acao()
    } catch (e) {
      setErro(mensagemDeErro(e, padraoErro))
    }
  }

  function salvar() {
    return executar(async () => {
      const { id, ...resto } = form
      await criterios.salvar({
        ...resto,
        id: id || undefined, // sem id o servidor gera um novo
        campo_perfil: form.campo_perfil || null,
        valor_referencia: form.campo_perfil ? null : form.valor_referencia || null,
        peso: form.tipo === 'PONTUAVEL' ? Number(form.peso || 1) : null,
        mensagem_reprovacao: form.tipo === 'ELIMINATORIO' ? form.mensagem_reprovacao || null : null,
      })
      setMensagem('Critério salvo com sucesso.')
      limpar()
      await carregar()
    }, 'Erro ao salvar critério')
  }

  function excluir(id: string) {
    return executar(async () => {
      await criterios.excluir(id)
      await carregar()
    }, 'Erro ao excluir critério.')
  }

  function alternarAtivo(id: string) {
    return executar(async () => {
      await criterios.alternarAtivo(id)
      await carregar()
    }, 'Erro ao alterar critério.')
  }

  function mover(lista: Criterio[], indice: number, deslocamento: -1 | 1) {
    const destino = indice + deslocamento
    if (destino < 0 || destino >= lista.length) return
    const ids = lista.map((c) => c.id)
    ;[ids[indice], ids[destino]] = [ids[destino]!, ids[indice]!]
    return executar(async () => {
      await criterios.reordenar(ids)
      await carregar()
    }, 'Erro ao reordenar critérios.')
  }

  function simular() {
    if (!editalId) return
    return executar(async () => {
      const resposta = await criterios.simular(editalId)
      setSimulacao(resposta.simulacao ?? null)
    }, 'Não foi possível simular.')
  }

  const operadoresDisponiveis = form.campo_edital ? operadoresDoCampo(form.campo_edital) : []
  const perfisDisponiveis = form.campo_edital ? camposPerfilCompativeis(form.campo_edital) : []
  const pesoTotal = pontuaveis.filter((c) => c.ativo).reduce((soma, c) => soma + (c.peso ?? 0), 0)

  function acoes(lista: Criterio[], indice: number, item: Criterio) {
    return (
      <div className="linha">
        <button className="btn btn--sm btn--fantasma" aria-label="Mover para cima" disabled={indice === 0} onClick={() => mover(lista, indice, -1)}>↑</button>
        <button className="btn btn--sm btn--fantasma" aria-label="Mover para baixo" disabled={indice === lista.length - 1} onClick={() => mover(lista, indice, 1)}>↓</button>
        <button className="btn btn--sm btn--fantasma" onClick={() => setForm(paraFormulario(item))}>Editar</button>
        <button className="btn btn--sm btn--fantasma" onClick={() => alternarAtivo(item.id)}>{item.ativo ? 'Desativar' : 'Ativar'}</button>
        <button className="btn btn--sm btn--perigo" onClick={() => excluir(item.id)}>Excluir</button>
      </div>
    )
  }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Critérios e pesos</h1>
          <p>Configuração do filtro dinâmico e simulação com edital analisado.</p>
        </div>
      </header>

      <div className="pilha">
        <div className="card">
          <div className="card__cabecalho"><h2>{form.id ? 'Editar critério' : 'Cadastro de critério'}</h2></div>
          <div className="card__corpo grade-3">
            <div className="campo"><label htmlFor="nome">Nome</label><input id="nome" className="input" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} /></div>
            <div className="campo"><label htmlFor="tipo">Tipo</label><select id="tipo" className="select" value={form.tipo} onChange={(e) => atualizarCampo('tipo', e.target.value as TipoCriterio)}><option value="ELIMINATORIO">Eliminatório</option><option value="PONTUAVEL">Pontuável</option></select></div>
            <div className="campo">
              <label htmlFor="campo_edital">Campo do edital</label>
              <select id="campo_edital" className="select" value={form.campo_edital} onChange={(e) => trocarCampoEdital(e.target.value)}>
                <option value="" disabled>Selecione…</option>
                {Object.entries(CAMPOS_CRITERIO_EDITAL).map(([campo, def]) => <option key={campo} value={campo}>{def.rotulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="operador">Operador</label>
              <select id="operador" className="select" value={form.operador} disabled={!form.campo_edital} onChange={(e) => atualizarCampo('operador', e.target.value as Operador)}>
                {operadoresDisponiveis.map((op) => <option key={op} value={op}>{OPERADORES[op]}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="campo_perfil">Comparar com (perfil)</label>
              <select id="campo_perfil" className="select" value={form.campo_perfil} disabled={!form.campo_edital} onChange={(e) => atualizarCampo('campo_perfil', e.target.value)}>
                <option value="">— valor de referência fixo —</option>
                {perfisDisponiveis.map((campo) => <option key={campo} value={campo}>{rotuloPerfil(campo)}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="valor_referencia">Valor de referência</label>
              <input id="valor_referencia" className="input" value={form.valor_referencia} disabled={!!form.campo_perfil} placeholder={form.campo_perfil ? 'Usando o campo do perfil' : 'Ex.: SUBVENCAO, CREDITO'} onChange={(e) => atualizarCampo('valor_referencia', e.target.value)} />
            </div>
            {form.tipo === 'PONTUAVEL'
              ? <div className="campo"><label htmlFor="peso">Peso (1–10)</label><input id="peso" type="number" min={1} max={10} className="input" value={form.peso} onChange={(e) => atualizarCampo('peso', e.target.value)} /></div>
              : <div className="campo"><label htmlFor="mensagem_reprovacao">Mensagem de reprovação</label><input id="mensagem_reprovacao" className="input" value={form.mensagem_reprovacao} onChange={(e) => atualizarCampo('mensagem_reprovacao', e.target.value)} /></div>}
            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => atualizarCampo('ativo', e.target.checked)} /> Ativo</label>
          </div>
          <div className="card__rodape linha linha--entre">
            <button className="btn btn--fantasma" onClick={limpar}>Limpar</button>
            <button className="btn btn--primario" onClick={salvar}>Salvar critério</button>
          </div>
          {mensagem ? <div className="card__rodape"><p className="aviso aviso--sucesso">{mensagem}</p></div> : null}
          {erro ? <div className="card__rodape"><p className="aviso aviso--erro" role="alert">{erro}</p></div> : null}
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Simulação</h2></div>
          <div className="card__corpo pilha">
            <div className="campo"><label htmlFor="edital_simulacao">Edital analisado</label><select id="edital_simulacao" className="select" value={editalId} onChange={(e) => setEditalId(e.target.value)}>{editais.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></div>
            <button className="btn btn--primario" onClick={simular}>Simular configuração atual</button>
            {simulacao ? <ResultadoSimulacaoView simulacao={simulacao} /> : null}
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Critérios eliminatórios</h2></div>
          <div className="card__corpo">
            {eliminatorios.map((item, indice) => (
              <div key={item.id} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--cor-linha)', padding: '0.75rem 0', opacity: item.ativo ? 1 : 0.55 }}>
                <div>
                  <strong>{item.nome}</strong>
                  <div className="discreto">{descreverRegra(item)}</div>
                </div>
                {acoes(eliminatorios, indice, item)}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Critérios pontuáveis</h2></div>
          <div className="card__corpo">
            {pontuaveis.map((item, indice) => {
              const relativo = item.ativo && pesoTotal ? Math.round((100 * (item.peso ?? 0)) / pesoTotal) : 0
              return (
                <div key={item.id} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--cor-linha)', padding: '0.75rem 0', opacity: item.ativo ? 1 : 0.55 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{item.nome}</strong>
                    <div className="discreto">{descreverRegra(item)}</div>
                    <div className="peso" style={{ maxWidth: 320 }}>
                      <span className="mono">Peso {item.peso}</span>
                      <span className="peso__barra" style={{ '--peso': relativo } as CSSProperties} />
                      <span className="mono discreto">{relativo}%</span>
                    </div>
                  </div>
                  {acoes(pontuaveis, indice, item)}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function ResultadoSimulacaoView({ simulacao: s }: { simulacao: ResultadoSimulacao }) {
  const rotulo = s.status_elegibilidade === 'ELEGIVEL' ? '✓ Elegível' : s.status_elegibilidade === 'INELEGIVEL' ? '✕ Inelegível' : '? Indeterminado'
  return (
    <div className="pilha">
      <div className="linha" style={{ gap: 'var(--esp-3)' }}>
        <span className={`badge badge--${s.status_elegibilidade.toLowerCase()}`}>{rotulo}</span>
        {s.nota_fit != null ? <strong className="mono">Fit {s.nota_fit}/100 · {s.classificacao}</strong> : null}
      </div>
      {s.criterios_violados.length ? (
        <ul className="pendencias">
          {s.criterios_violados.map((x) => <li key={x.criterio_id}><strong>{x.nome}:</strong> {x.motivo}</li>)}
        </ul>
      ) : null}
      {s.criterios_indeterminados.length ? (
        <ul className="pendencias">
          {s.criterios_indeterminados.map((x) => <li key={x.criterio_id}><strong>{x.nome}:</strong> não localizado no edital — {x.campo_faltante}</li>)}
        </ul>
      ) : null}
      {s.detalhamento_pontuacao.length ? (
        <table className="tabela">
          <thead><tr><th>Critério</th><th>Peso</th><th>Pontuação</th><th>Contribuição</th></tr></thead>
          <tbody>
            {s.detalhamento_pontuacao.map((x) => (
              <tr key={x.criterio_id}><td>{x.nome}</td><td className="mono">{x.peso}</td><td className="mono">{x.pontuacao}</td><td className="mono">{x.contribuicao}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
