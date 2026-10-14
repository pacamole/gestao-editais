import { useEffect, useState } from 'react'
import type { Criterio, Operador, ResultadoSimulacao, TipoCriterio } from '../../shared/tipos/criterios'
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
      if (lista[0]?.id) setEditalId(lista[0].id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar os critérios.'))
    }
  }

  useEffect(() => { carregar() }, [])

  function atualizarCampo<K extends keyof FormCriterio>(campo: K, valor: FormCriterio[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
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
        valor_referencia: form.valor_referencia || null,
        peso: form.tipo === 'PONTUAVEL' ? Number(form.peso || 1) : null,
        mensagem_reprovacao: form.mensagem_reprovacao || null,
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

  function simular() {
    if (!editalId) return
    return executar(async () => {
      const resposta = await criterios.simular(editalId)
      setSimulacao(resposta.simulacao ?? null)
    }, 'Não foi possível simular.')
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
          <div className="card__cabecalho"><h2>Cadastro de critério</h2></div>
          <div className="card__corpo grade-3">
            <div className="campo"><label htmlFor="nome">Nome</label><input id="nome" className="input" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} /></div>
            <div className="campo"><label htmlFor="tipo">Tipo</label><select id="tipo" className="select" value={form.tipo} onChange={(e) => atualizarCampo('tipo', e.target.value as TipoCriterio)}><option value="ELIMINATORIO">Eliminatório</option><option value="PONTUAVEL">Pontuável</option></select></div>
            <div className="campo"><label htmlFor="campo_edital">Campo do edital</label><input id="campo_edital" className="input" value={form.campo_edital} onChange={(e) => atualizarCampo('campo_edital', e.target.value)} /></div>
            <div className="campo"><label htmlFor="campo_perfil">Campo do perfil</label><input id="campo_perfil" className="input" value={form.campo_perfil} onChange={(e) => atualizarCampo('campo_perfil', e.target.value)} /></div>
            <div className="campo"><label htmlFor="operador">Operador</label><select id="operador" className="select" value={form.operador} onChange={(e) => atualizarCampo('operador', e.target.value as Operador)}><option value="LISTA_VAZIA_OU_CONTEM">LISTA_VAZIA_OU_CONTEM</option><option value="CONTEM">CONTEM</option><option value="NAO_CONTEM">NAO_CONTEM</option><option value="INTERSECCAO">INTERSECCAO</option><option value="CONTIDO_EM">CONTIDO_EM</option><option value="IGUAL">IGUAL</option><option value="DIFERENTE">DIFERENTE</option><option value="MAIOR_QUE">MAIOR_QUE</option><option value="MENOR_QUE">MENOR_QUE</option><option value="ENTRE">ENTRE</option><option value="VERDADEIRO">VERDADEIRO</option><option value="FALSO">FALSO</option></select></div>
            <div className="campo"><label htmlFor="valor_referencia">Valor de referência</label><input id="valor_referencia" className="input" value={form.valor_referencia} onChange={(e) => atualizarCampo('valor_referencia', e.target.value)} /></div>
            <div className="campo"><label htmlFor="mensagem_reprovacao">Mensagem de reprovação</label><input id="mensagem_reprovacao" className="input" value={form.mensagem_reprovacao} onChange={(e) => atualizarCampo('mensagem_reprovacao', e.target.value)} /></div>
            {form.tipo === 'PONTUAVEL' ? <div className="campo"><label htmlFor="peso">Peso (1–10)</label><input id="peso" type="number" min={1} max={10} className="input" value={form.peso} onChange={(e) => atualizarCampo('peso', e.target.value)} /></div> : <div className="campo"><label htmlFor="peso_disabled">Peso</label><input id="peso_disabled" className="input" disabled value="—" /></div>}
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
          <div className="card__corpo">
            <div className="campo"><label htmlFor="edital_simulacao">Edital analisado</label><select id="edital_simulacao" className="select" value={editalId} onChange={(e) => setEditalId(e.target.value)}>{editais.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></div>
            <button className="btn btn--primario" onClick={simular}>Simular configuração atual</button>
            {simulacao ? <div className="aviso aviso--sucesso"><strong>{simulacao.status}</strong> · nota {simulacao.nota_fit} · {simulacao.resumo}</div> : null}
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Critérios eliminatórios</h2></div>
          <div className="card__corpo">
            {eliminatorios.map((item) => (
              <div key={item.id} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--linha)', padding: '0.75rem 0' }}>
                <div>
                  <strong>{item.nome}</strong>
                  <div className="discreto">{item.campo_edital} · {item.operador}</div>
                </div>
                <div className="linha">
                  <button className="btn btn--sm btn--fantasma" onClick={() => setForm(paraFormulario(item))}>Editar</button>
                  <button className="btn btn--sm btn--fantasma" onClick={() => alternarAtivo(item.id)}>{item.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="btn btn--sm btn--perigo" onClick={() => excluir(item.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Critérios pontuáveis</h2></div>
          <div className="card__corpo">
            {pontuaveis.map((item) => (
              <div key={item.id} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--linha)', padding: '0.75rem 0' }}>
                <div>
                  <strong>{item.nome}</strong>
                  <div className="discreto">Peso {item.peso} · {item.campo_edital}</div>
                </div>
                <div className="linha">
                  <button className="btn btn--sm btn--fantasma" onClick={() => setForm(paraFormulario(item))}>Editar</button>
                  <button className="btn btn--sm btn--fantasma" onClick={() => alternarAtivo(item.id)}>{item.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="btn btn--sm btn--perigo" onClick={() => excluir(item.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
