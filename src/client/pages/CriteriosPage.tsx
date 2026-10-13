import { useEffect, useState } from 'react'

const criterioInicial = {
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

export function CriteriosPage() {
  const [eliminatorios, setEliminatorios] = useState<any[]>([])
  const [pontuaveis, setPontuaveis] = useState<any[]>([])
  const [editalId, setEditalId] = useState('')
  const [editais, setEditais] = useState<any[]>([])
  const [form, setForm] = useState(criterioInicial)
  const [simulacao, setSimulacao] = useState<any>(null)
  const [mensagem, setMensagem] = useState('')

  async function carregar() {
    const [criteriosResp, editaisResp] = await Promise.all([
      fetch('/api/criterios'),
      fetch('/api/editais?limite=20'),
    ])
    const crit = await criteriosResp.json()
    const lista = await editaisResp.json()
    setEliminatorios(crit.eliminatorios ?? [])
    setPontuaveis(crit.pontuaveis ?? [])
    setEditais(lista.itens ?? [])
    if (lista.itens?.[0]?.id) setEditalId(lista.itens[0].id)
  }

  useEffect(() => { carregar() }, [])

  function atualizarCampo(campo: string, valor: string | boolean) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function limpar() {
    setForm(criterioInicial)
  }

  async function salvar() {
    const body = {
      ...form,
      campo_perfil: form.campo_perfil || null,
      valor_referencia: form.valor_referencia || null,
      peso: form.tipo === 'PONTUAVEL' ? Number(form.peso || 1) : null,
      mensagem_reprovacao: form.mensagem_reprovacao || null,
      ativo: form.ativo,
    }

    const resp = await fetch('/api/criterios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await resp.json()
    if (!resp.ok) throw new Error(json.erro ?? 'Erro ao salvar critério')
    setMensagem('Critério salvo com sucesso.')
    limpar()
    carregar()
  }

  async function excluir(id: string) {
    const resp = await fetch(`/api/criterios/${id}`, { method: 'DELETE' })
    if (resp.ok) carregar()
  }

  async function alternarAtivo(id: string) {
    await fetch(`/api/criterios/${id}/ativo`, { method: 'PATCH' })
    carregar()
  }

  async function simular() {
    if (!editalId) return
    const resp = await fetch('/api/criterios/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edital_id: editalId }),
    })
    const json = await resp.json()
    setSimulacao(json.simulacao ?? null)
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
            <div className="campo"><label htmlFor="tipo">Tipo</label><select id="tipo" className="select" value={form.tipo} onChange={(e) => atualizarCampo('tipo', e.target.value)}><option value="ELIMINATORIO">Eliminatório</option><option value="PONTUAVEL">Pontuável</option></select></div>
            <div className="campo"><label htmlFor="campo_edital">Campo do edital</label><input id="campo_edital" className="input" value={form.campo_edital} onChange={(e) => atualizarCampo('campo_edital', e.target.value)} /></div>
            <div className="campo"><label htmlFor="campo_perfil">Campo do perfil</label><input id="campo_perfil" className="input" value={form.campo_perfil} onChange={(e) => atualizarCampo('campo_perfil', e.target.value)} /></div>
            <div className="campo"><label htmlFor="operador">Operador</label><select id="operador" className="select" value={form.operador} onChange={(e) => atualizarCampo('operador', e.target.value)}><option value="LISTA_VAZIA_OU_CONTEM">LISTA_VAZIA_OU_CONTEM</option><option value="CONTEM">CONTEM</option><option value="NAO_CONTEM">NAO_CONTEM</option><option value="INTERSECCAO">INTERSECCAO</option><option value="CONTIDO_EM">CONTIDO_EM</option><option value="IGUAL">IGUAL</option><option value="DIFERENTE">DIFERENTE</option><option value="MAIOR_QUE">MAIOR_QUE</option><option value="MENOR_QUE">MENOR_QUE</option><option value="ENTRE">ENTRE</option><option value="VERDADEIRO">VERDADEIRO</option><option value="FALSO">FALSO</option></select></div>
            <div className="campo"><label htmlFor="valor_referencia">Valor de referência</label><input id="valor_referencia" className="input" value={form.valor_referencia} onChange={(e) => atualizarCampo('valor_referencia', e.target.value)} /></div>
            <div className="campo"><label htmlFor="mensagem_reprovacao">Mensagem de reprovação</label><input id="mensagem_reprovacao" className="input" value={form.mensagem_reprovacao} onChange={(e) => atualizarCampo('mensagem_reprovacao', e.target.value)} /></div>
            {form.tipo === 'PONTUAVEL' ? <div className="campo"><label htmlFor="peso">Peso (1–10)</label><input id="peso" type="number" min={1} max={10} className="input" value={form.peso} onChange={(e) => atualizarCampo('peso', e.target.value)} /></div> : <div className="campo"><label htmlFor="peso_disabled">Peso</label><input id="peso_disabled" className="input" disabled value="—" /></div>}
            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => atualizarCampo('ativo', e.target.checked)} /> Ativo</label>
          </div>
          <div className="card__rodape linha linha--entre">
            <button className="btn btn--fantasma" onClick={limpar}>Limpar</button>
            <button className="btn btn--primario" onClick={salvar}>Salvar critério</button>
          </div>
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
                  <button className="btn btn--sm btn--fantasma" onClick={() => setForm(item)}>Editar</button>
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
                  <button className="btn btn--sm btn--fantasma" onClick={() => setForm(item)}>Editar</button>
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
