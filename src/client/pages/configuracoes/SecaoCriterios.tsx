import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import type { Criterio, Operador, ResultadoSimulacao, SalvarCriterioEntrada, TipoCriterio } from '../../../shared/tipos/criterios'
import {
  CAMPOS_CRITERIO_EDITAL,
  CAMPOS_CRITERIO_PERFIL,
  OPERADORES_SEM_REFERENCIA,
  camposPerfilCompativeis,
  operadoresDoCampo,
} from '../../../shared/catalogoCriterios'
import { CAMPOS_EDITAL, MODALIDADES, type CampoEdital } from '../../../shared/rotulos'
import { criterios, type EditalParaSimulacao } from '../../api/criterios'
import { mensagemDeErro } from '../../api/cliente'
import { MenuAcoes, type AcaoMenu } from '../../components/MenuAcoes'
import { Modal } from '../../components/Modal'
import { explicarCriterio } from './explicacaoCriterio'
import { FormulaCriterio, LegendaFormula } from './FormulaCriterio'
import { formulaDoCriterio } from './montarFormula'

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
}

const criterioInicial: FormCriterio = {
  id: '',
  nome: '',
  tipo: 'ELIMINATORIO',
  campo_edital: '',
  campo_perfil: '',
  operador: 'LISTA_VAZIA_OU_CONTEM',
  valor_referencia: '',
  peso: '5',
  mensagem_reprovacao: '',
  ativo: true,
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
    peso: c.peso == null ? '5' : String(c.peso),
    mensagem_reprovacao: c.mensagem_reprovacao ?? '',
    ativo: c.ativo,
  }
}

// O formulário no formato da API.
function paraEnvio(form: FormCriterio): SalvarCriterioEntrada {
  const { id, ...resto } = form
  const semReferencia = OPERADORES_SEM_REFERENCIA.includes(form.operador) && !form.campo_perfil
  return {
    ...resto,
    id: id || undefined, // sem id o servidor gera um novo
    campo_perfil: form.campo_perfil || null,
    valor_referencia: form.campo_perfil || semReferencia ? null : form.valor_referencia || null,
    peso: form.tipo === 'PONTUAVEL' ? Number(form.peso || 1) : null,
    mensagem_reprovacao: form.tipo === 'ELIMINATORIO' ? form.mensagem_reprovacao || null : null,
  }
}

const regraDe = (c: Criterio) => ({
  ...c,
  campo_perfil: c.campo_perfil ?? '',
  valor_referencia: c.valor_referencia ?? '',
  mensagem_reprovacao: c.mensagem_reprovacao ?? '',
})

const TIPOS: { valor: TipoCriterio; titulo: string; texto: string }[] = [
  { valor: 'ELIMINATORIO', titulo: 'Eliminatório', texto: 'Decide se a empresa pode participar. Se reprovar, o edital fica Não elegível.' },
  { valor: 'PONTUAVEL', titulo: 'Pontuável', texto: 'Soma pontos na nota de fit (0 a 100) dos editais elegíveis.' },
]

const sufixoReavaliados = (n: number) => (n ? ` ${n} edital(is) em andamento reavaliado(s).` : '')

export function SecaoCriterios() {
  const [eliminatorios, setEliminatorios] = useState<Criterio[]>([])
  const [pontuaveis, setPontuaveis] = useState<Criterio[]>([])
  const [editalId, setEditalId] = useState('')
  const [editais, setEditais] = useState<EditalParaSimulacao[]>([])
  // null = modal fechado; com id '' = critério novo.
  const [form, setForm] = useState<FormCriterio | null>(null)
  const [erroModal, setErroModal] = useState('')
  const [salvando, setSalvando] = useState(false)
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
    setForm((atual) => (atual ? { ...atual, [campo]: valor } : atual))
  }

  // Trocar o dado do edital descarta a regra e a comparação incompatíveis com o novo tipo.
  function trocarCampoEdital(campoEdital: string) {
    setForm((atual) => {
      if (!atual) return atual
      const operadores = operadoresDoCampo(campoEdital)
      return {
        ...atual,
        campo_edital: campoEdital,
        operador: operadores.includes(atual.operador) ? atual.operador : (operadores[0] ?? atual.operador),
        campo_perfil: camposPerfilCompativeis(campoEdital).includes(atual.campo_perfil) ? atual.campo_perfil : '',
      }
    })
  }

  function abrir(inicial: FormCriterio) {
    setMensagem('')
    setErro('')
    setErroModal('')
    setForm(inicial)
  }

  function fechar() {
    if (!salvando) setForm(null)
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

  // O erro de validação aparece dentro do modal, que continua aberto para corrigir.
  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErroModal('')
    setSalvando(true)
    try {
      const resposta = await criterios.salvar(paraEnvio(form))
      setMensagem(`${form.id ? 'Critério atualizado.' : 'Critério adicionado.'}${sufixoReavaliados(resposta.editaisReavaliados)}`)
      setForm(null)
      await carregar()
    } catch (falha) {
      setErroModal(mensagemDeErro(falha, 'Erro ao salvar critério.'))
    } finally {
      setSalvando(false)
    }
  }

  function excluir(item: Criterio) {
    if (!window.confirm(`Excluir o critério "${item.nome}"? Os editais em andamento serão reavaliados sem ele. Para só deixar de usar, prefira Desativar.`)) return
    return executar(async () => {
      const resposta = await criterios.excluir(item.id)
      setMensagem(`Critério excluído.${sufixoReavaliados(resposta.editaisReavaliados)}`)
      await carregar()
    }, 'Erro ao excluir critério.')
  }

  function alternarAtivo(item: Criterio) {
    return executar(async () => {
      const resposta = await criterios.alternarAtivo(item.id)
      setMensagem(`Critério ${item.ativo ? 'desativado' : 'ativado'}.${sufixoReavaliados(resposta.editaisReavaliados)}`)
      await carregar()
    }, 'Erro ao alterar critério.')
  }

  function simular() {
    if (!editalId) return
    return executar(async () => {
      const resposta = await criterios.simular(editalId)
      setSimulacao(resposta.simulacao ?? null)
    }, 'Não foi possível simular.')
  }

  const acoes = (item: Criterio): AcaoMenu[] => [
    { rotulo: 'Editar', aoClicar: () => abrir(paraFormulario(item)) },
    { rotulo: item.ativo ? 'Desativar' : 'Ativar', aoClicar: () => alternarAtivo(item) },
    { rotulo: 'Excluir', aoClicar: () => excluir(item), perigo: true },
  ]

  const pesoAtivo = (c: Criterio) => (c.ativo ? (c.peso ?? 0) : 0)
  const pesoTotal = pontuaveis.reduce((soma, c) => soma + pesoAtivo(c), 0)

  // No formulário, o total considera o peso que está sendo digitado (e o critério como ativo, se marcado).
  const pesoDoForm = form?.tipo === 'PONTUAVEL' && form.ativo ? Number(form.peso || 0) : 0
  const totalComForm = pontuaveis.filter((c) => c.id !== form?.id).reduce((soma, c) => soma + pesoAtivo(c), 0) + pesoDoForm
  const explicacaoDoForm = form
    ? explicarCriterio(form, form.tipo === 'PONTUAVEL' && form.ativo ? { peso: pesoDoForm, total: totalComForm } : undefined)
    : null

  const operadoresDisponiveis = form?.campo_edital ? operadoresDoCampo(form.campo_edital) : []
  const perfisDisponiveis = form?.campo_edital ? camposPerfilCompativeis(form.campo_edital) : []
  const referenciaOpcional = form ? OPERADORES_SEM_REFERENCIA.includes(form.operador) : false

  return (
    <section>
      <div className="pilha">
        {mensagem ? <p className="aviso aviso--sucesso" role="status">{mensagem}</p> : null}
        {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}

        <div className="card">
          <div className="card__cabecalho"><h2>Como o sistema avalia um edital</h2></div>
          <div className="card__corpo pilha">
            <ol className="passos">
              <li className="passo">
                <span className="passo__icone">1</span>
                <div className="passo__conteudo">
                  <strong>Critérios eliminatórios: a empresa pode participar?</strong>
                  <span className="discreto">
                    Cada um compara um dado do edital (lido pela IA) com o perfil da empresa. Se algum reprovar, o edital fica{' '}
                    <span className="badge badge--inelegivel">✕ Não elegível</span>. Se a IA não achar o dado, fica{' '}
                    <span className="badge badge--indeterminado">? Em revisão</span> até alguém conferir. Passando em todos, é{' '}
                    <span className="badge badge--elegivel">✓ Elegível</span>.
                  </span>
                </div>
              </li>
              <li className="passo">
                <span className="passo__icone">2</span>
                <div className="passo__conteudo">
                  <strong>Critérios pontuáveis: o edital vale a pena?</strong>
                  <span className="discreto">
                    Só para os elegíveis. Cada critério dá de 0 a 1 e o peso diz quanto ele conta: a nota de fit é a soma dos
                    pontos de todos, de 0 a 100. 70 ou mais é fit alto; de 40 a 69, médio; abaixo de 40, baixo.
                  </span>
                </div>
              </li>
            </ol>
            <div className="pilha">
              <span className="discreto">Em cada critério, a conta usa estas cores:</span>
              <LegendaFormula />
            </div>
            <p className="discreto">
              Ao salvar, ativar, desativar ou excluir um critério, os editais em andamento são reavaliados na hora. Os dados da
              empresa usados nas comparações ficam em Configurações › Perfil da empresa.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Critérios eliminatórios</h2>
              <p className="discreto">Basta um reprovar para o edital ficar Não elegível.</p>
            </div>
            <button className="btn btn--sm btn--primario" onClick={() => abrir({ ...criterioInicial, tipo: 'ELIMINATORIO' })}>+ Novo critério</button>
          </div>
          <ListaCriterios itens={eliminatorios} acoes={acoes} />
        </div>

        <div className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Critérios pontuáveis</h2>
              <p className="discreto">A barra mostra quanto cada critério pode pesar na nota, entre os ativos.</p>
            </div>
            <button className="btn btn--sm btn--primario" onClick={() => abrir({ ...criterioInicial, tipo: 'PONTUAVEL' })}>+ Novo critério</button>
          </div>
          <ListaCriterios itens={pontuaveis} acoes={acoes} pesoTotal={pesoTotal} />
        </div>

        <div className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Testar com um edital</h2>
              <p className="discreto">Mostra o resultado que o edital teria com os critérios atuais. Nada é salvo.</p>
            </div>
          </div>
          <div className="card__corpo pilha">
            <div className="linha" style={{ alignItems: 'flex-end' }}>
              <div className="campo" style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="edital_simulacao">Edital</label>
                <select id="edital_simulacao" className="select" value={editalId} onChange={(e) => setEditalId(e.target.value)}>
                  {editais.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
                </select>
              </div>
              <button className="btn btn--primario" onClick={simular} disabled={!editalId}>Testar</button>
            </div>
            {simulacao ? <ResultadoSimulacaoView simulacao={simulacao} /> : null}
          </div>
        </div>
      </div>

      <Modal
        aberto={form !== null}
        titulo={form?.id ? 'Editar critério' : 'Novo critério'}
        aoFechar={fechar}
        rodape={
          <>
            <span />
            <div className="linha">
              <button type="button" className="btn btn--fantasma" onClick={fechar} disabled={salvando}>Cancelar</button>
              <button type="submit" form="form-criterio" className="btn btn--primario" disabled={salvando}>
                {salvando ? 'Salvando…' : form?.id ? 'Salvar alterações' : 'Adicionar critério'}
              </button>
            </div>
          </>
        }
      >
        {form ? (
          <form id="form-criterio" className="pilha" onSubmit={salvar}>
            <fieldset className="escolha-tipo">
              <legend>O que este critério faz</legend>
              {TIPOS.map((t) => (
                <label key={t.valor} className={`escolha-tipo__opcao${form.tipo === t.valor ? ' escolha-tipo__opcao--ativa' : ''}`}>
                  <input type="radio" name="tipo" value={t.valor} checked={form.tipo === t.valor} onChange={() => atualizarCampo('tipo', t.valor)} />
                  <strong>{t.titulo}</strong>
                  <span className="discreto">{t.texto}</span>
                </label>
              ))}
            </fieldset>

            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" className="input" autoFocus required placeholder="Ex.: Porte aceito" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} />
            </div>

            <fieldset className="pilha regra-criterio">
              <legend>Regra de cálculo</legend>
              <div className="regra-campo regra-campo--edital">
                <label htmlFor="campo_edital">Qual dado do edital?</label>
                <select id="campo_edital" className="select" required value={form.campo_edital} onChange={(e) => trocarCampoEdital(e.target.value)}>
                  <option value="" disabled>Escolha o dado…</option>
                  {Object.entries(CAMPOS_CRITERIO_EDITAL).map(([campo, def]) => <option key={campo} value={campo}>{def.rotulo}</option>)}
                </select>
                <span className="regra-campo__dica">Lido pela IA no documento do edital.</span>
              </div>
              <div className="regra-campo regra-campo--regra">
                <label htmlFor="operador">Qual regra?</label>
                <select id="operador" className="select" value={form.operador} disabled={!form.campo_edital} onChange={(e) => atualizarCampo('operador', e.target.value as Operador)}>
                  {operadoresDisponiveis.map((op) => <option key={op} value={op}>{rotuloDaRegra(op, form.campo_edital)}</option>)}
                </select>
                <span className="regra-campo__dica">{form.campo_edital ? 'Como o dado do edital é comparado.' : 'Escolha primeiro o dado do edital.'}</span>
              </div>
              <div className={`regra-campo ${form.campo_perfil ? 'regra-campo--perfil' : 'regra-campo--fixo'}`}>
                <label htmlFor="campo_perfil">{referenciaOpcional ? 'A empresa também atende se tiver… (opcional)' : 'Comparar com o quê?'}</label>
                <select id="campo_perfil" className="select" value={form.campo_perfil} disabled={!form.campo_edital} onChange={(e) => atualizarCampo('campo_perfil', e.target.value)}>
                  <option value="">{referenciaOpcional ? 'Nada: vale só o dado do edital' : 'Um valor que eu defino'}</option>
                  {perfisDisponiveis.length ? (
                    <optgroup label="Dados do perfil da empresa">
                      {perfisDisponiveis.map((campo) => <option key={campo} value={campo}>{CAMPOS_CRITERIO_PERFIL[campo]?.rotulo ?? campo}</option>)}
                    </optgroup>
                  ) : null}
                </select>
                <span className="regra-campo__dica">
                  {form.campo_perfil ? 'Vem do Perfil da empresa (Configurações › Perfil da empresa).' : referenciaOpcional ? 'Sem comparação: a regra olha só o edital.' : 'Você informa o valor logo abaixo.'}
                </span>
                {!form.campo_perfil && !referenciaOpcional && form.campo_edital ? (
                  <CampoValorFixo campoEdital={form.campo_edital} valor={form.valor_referencia} aoMudar={(v) => atualizarCampo('valor_referencia', v)} />
                ) : null}
              </div>

              {form.tipo === 'PONTUAVEL' ? (
                <div className="campo">
                  <label htmlFor="peso">Peso: {form.peso || 1} de 10</label>
                  <input id="peso" type="range" min={1} max={10} step={1} value={form.peso || 1} onChange={(e) => atualizarCampo('peso', e.target.value)} />
                </div>
              ) : (
                <div className="campo">
                  <label htmlFor="mensagem_reprovacao">Motivo mostrado quando reprovar</label>
                  <input id="mensagem_reprovacao" className="input" placeholder="Ex.: O porte da empresa não é aceito pelo edital." value={form.mensagem_reprovacao} onChange={(e) => atualizarCampo('mensagem_reprovacao', e.target.value)} />
                </div>
              )}
            </fieldset>

            <div className="como-calcula" aria-live="polite">
              <strong>Como o sistema vai calcular</strong>
              {explicacaoDoForm?.passos.length ? (
                <div className="criterio-lado-a-lado">
                  <ul>
                    {explicacaoDoForm.passos.map((p) => (
                      <li key={p.texto}><span className="como-calcula__icone" aria-hidden="true">{p.icone}</span>{p.texto}</li>
                    ))}
                  </ul>
                  <FormulaCriterio linhas={formulaDoCriterio({ ...form, peso: Number(form.peso || 1) })} />
                </div>
              ) : (
                <p className="discreto">Escolha o dado do edital para ver o cálculo.</p>
              )}
            </div>

            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => atualizarCampo('ativo', e.target.checked)} /> Usar este critério na avaliação</label>
            {erroModal ? <p className="aviso aviso--erro" role="alert">{erroModal}</p> : null}
          </form>
        ) : null}
      </Modal>
    </section>
  )
}

// A regra como resposta a "Qual regra?". Em datas, maior e menor viram depois e antes.
const ROTULOS_REGRA: Record<Operador, string> = {
  LISTA_VAZIA_OU_CONTEM: 'aceita (ou não tem restrição)',
  CONTEM: 'contém algum item de',
  NAO_CONTEM: 'não contém nenhum item de',
  INTERSECCAO: 'tem algum item em comum com',
  CONTIDO_EM: 'tudo o que exige está em',
  IGUAL: 'é igual a',
  DIFERENTE: 'é diferente de',
  MAIOR_QUE: 'é maior ou igual a',
  MENOR_QUE: 'é menor ou igual a',
  ENTRE: 'tem faixa que inclui',
  VERDADEIRO: 'é "sim"',
  FALSO: 'é "não" (ou a empresa atende)',
}

function rotuloDaRegra(operador: Operador, campoEdital: string): string {
  if (CAMPOS_CRITERIO_EDITAL[campoEdital]?.tipo === 'data') {
    if (operador === 'MAIOR_QUE') return 'é no mesmo dia ou depois de'
    if (operador === 'MENOR_QUE') return 'é no mesmo dia ou antes de'
  }
  return ROTULOS_REGRA[operador]
}

// O valor fixo no formato do dado: data, número, modalidade ou texto (vários separados por vírgula).
function CampoValorFixo({ campoEdital, valor, aoMudar }: { campoEdital: string; valor: string; aoMudar: (valor: string) => void }) {
  const tipo = (CAMPOS_EDITAL as Record<string, CampoEdital>)[campoEdital]?.tipo
  const comum = { id: 'valor_referencia', value: valor, onChange: (e: { target: { value: string } }) => aoMudar(e.target.value) }
  return (
    <div className="campo">
      <label htmlFor="valor_referencia">Valor</label>
      {tipo === 'modalidade' ? (
        <select className="select" {...comum}>
          <option value="" disabled>Escolha a modalidade…</option>
          {Object.entries(MODALIDADES).map(([codigo, rotulo]) => <option key={codigo} value={codigo}>{rotulo}</option>)}
        </select>
      ) : tipo === 'data' ? (
        <input type="date" className="input" {...comum} />
      ) : tipo === 'moeda' || tipo === 'percentual' || tipo === 'inteiro' ? (
        <input type="number" inputMode="decimal" className="input" placeholder={tipo === 'moeda' ? 'Em reais, ex.: 500000' : tipo === 'percentual' ? 'Em %, ex.: 20' : 'Ex.: 24'} {...comum} />
      ) : (
        <input className="input" placeholder="Para mais de um, separe por vírgula" {...comum} />
      )}
    </div>
  )
}

// Cada critério: o texto explicativo de um lado e a conta do outro.
function ListaCriterios({ itens, acoes, pesoTotal }: { itens: Criterio[]; acoes: (c: Criterio) => AcaoMenu[]; pesoTotal?: number }) {
  if (!itens.length) return <div className="card__corpo discreto">Nenhum critério cadastrado.</div>
  return (
    <ul className="lista-criterios">
      {itens.map((item) => {
        const relativo = pesoTotal != null && item.ativo && pesoTotal ? Math.round((100 * (item.peso ?? 0)) / pesoTotal) : 0
        return (
          <li key={item.id} className={`lista-criterios__item${item.ativo ? '' : ' lista-criterios__item--inativo'}`}>
            <div className="criterio-lado-a-lado">
              <div className="lista-criterios__texto">
                <div className="linha">
                  <strong>{item.nome}</strong>
                  {item.ativo ? null : <span className="badge">Desativado</span>}
                </div>
                <div className="discreto">{explicarCriterio(regraDe(item)).resumo}</div>
                {pesoTotal != null ? (
                  <div className="peso">
                    <span className="mono">Peso {item.peso}</span>
                    <span className="peso__barra" style={{ '--peso': relativo } as CSSProperties} />
                    <span className="mono discreto">{item.ativo ? `até ${relativo}% da nota` : 'fora da nota'}</span>
                  </div>
                ) : null}
              </div>
              <FormulaCriterio linhas={formulaDoCriterio(regraDe(item))} />
            </div>
            <MenuAcoes rotulo={`Ações do critério ${item.nome}`} acoes={acoes(item)} />
          </li>
        )
      })}
    </ul>
  )
}

function ResultadoSimulacaoView({ simulacao: s }: { simulacao: ResultadoSimulacao }) {
  const rotulo = s.status_elegibilidade === 'ELEGIVEL' ? '✓ Elegível' : s.status_elegibilidade === 'INELEGIVEL' ? '✕ Não elegível' : '? Em revisão'
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
        <div className="card__corpo--justo">
          <table className="tabela">
            <thead><tr><th>Critério</th><th>Peso</th><th>Pontuação (0 a 1)</th><th>Pontos na nota</th></tr></thead>
            <tbody>
              {s.detalhamento_pontuacao.map((x) => (
                <tr key={x.criterio_id}><td>{x.nome}</td><td className="mono">{x.peso}</td><td className="mono">{x.pontuacao}</td><td className="mono">{x.contribuicao}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
