import { useEffect, useState } from 'react'

const fonteInicial = {
  id: '',
  nome: '',
  url_base: '',
  tipo: 'SCRAPER',
  frequencia_cron: '0 6 * * *',
  ativo: true,
}

export function FontesPage() {
  const [fontes, setFontes] = useState<any[]>([])
  const [form, setForm] = useState(fonteInicial)
  const [mensagem, setMensagem] = useState('')

  async function carregar() {
    const resp = await fetch('/api/fontes')
    const json = await resp.json()
    setFontes(json.fontes ?? [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    const resp = await fetch('/api/fontes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await resp.json()
    if (!resp.ok) throw new Error(json.erro ?? 'Erro ao salvar fonte.')
    setMensagem('Fonte salva com sucesso.')
    setForm(fonteInicial)
    carregar()
  }

  async function alternarAtivo(id: string) {
    await fetch(`/api/fontes/${id}/ativo`, { method: 'PATCH' })
    carregar()
  }

  async function dispararColeta(id: string) {
    const resp = await fetch(`/api/fontes/${id}/coletar`, { method: 'POST' })
    const json = await resp.json()
    setMensagem(resp.ok ? 'Coleta disparada com sucesso.' : json.erro ?? 'Falha ao disparar coleta.')
    carregar()
  }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Fontes monitoradas</h1>
          <p>Gerenciamento dos portais e da coleta periódica.</p>
        </div>
      </header>

      <div className="pilha">
        <div className="card">
          <div className="card__cabecalho"><h2>Nova fonte</h2></div>
          <div className="card__corpo grade-3">
            <div className="campo"><label htmlFor="nome_fonte">Nome</label><input id="nome_fonte" className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="tipo_fonte">Tipo</label><select id="tipo_fonte" className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="SCRAPER">SCRAPER</option><option value="RSS">RSS</option><option value="URL_MANUAL">URL_MANUAL</option><option value="UPLOAD_MANUAL">UPLOAD_MANUAL</option></select></div>
            <div className="campo"><label htmlFor="url_base">URL base</label><input id="url_base" className="input" value={form.url_base} onChange={(e) => setForm({ ...form, url_base: e.target.value })} /></div>
            <div className="campo"><label htmlFor="frequencia_cron">Frequência cron</label><input id="frequencia_cron" className="input" value={form.frequencia_cron} onChange={(e) => setForm({ ...form, frequencia_cron: e.target.value })} /></div>
            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativa</label>
          </div>
          <div className="card__rodape linha linha--entre">
            <button className="btn btn--fantasma" onClick={() => setForm(fonteInicial)}>Limpar</button>
            <button className="btn btn--primario" onClick={salvar}>Salvar fonte</button>
          </div>
          {mensagem ? <div className="card__rodape"><p className="aviso aviso--sucesso">{mensagem}</p></div> : null}
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Fontes cadastradas</h2></div>
          <div className="card__corpo--justo">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Frequência</th><th>Últ. coleta</th><th>Itens</th><th>Situação</th><th>Ações</th></tr></thead>
              <tbody>
                {fontes.map((fonte) => (
                  <tr key={fonte.id}>
                    <td>{fonte.nome}</td>
                    <td>{fonte.tipo}</td>
                    <td>{fonte.frequencia_cron ?? '—'}</td>
                    <td>{fonte.ultima_coleta_em ? new Date(fonte.ultima_coleta_em).toLocaleString('pt-BR') : '—'}</td>
                    <td>{fonte.execucoes?.[0]?.itens_coletados ?? 0}</td>
                    <td><span className={`badge badge--${fonte.ultimo_status === 'SUCESSO' ? 'sucesso' : fonte.ultimo_status === 'FALHA' ? 'perigo' : fonte.ultimo_status === 'PARCIAL' ? 'atencao' : 'fantasma'}`}>{fonte.ultimo_status ?? 'Sem execução'}</span></td>
                    <td className="linha">
                      <button className="btn btn--sm btn--fantasma" onClick={() => setForm({ id: fonte.id, nome: fonte.nome, url_base: fonte.url_base ?? '', tipo: fonte.tipo, frequencia_cron: fonte.frequencia_cron ?? '', ativo: Boolean(fonte.ativo) })}>Editar</button>
                      <button className="btn btn--sm btn--fantasma" onClick={() => alternarAtivo(fonte.id)}>{fonte.ativo ? 'Desativar' : 'Ativar'}</button>
                      <button className="btn btn--sm btn--primario" onClick={() => dispararColeta(fonte.id)}>Coletar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Últimas 10 execuções</h2></div>
          <div className="card__corpo">
            {fontes.flatMap((fonte) => fonte.execucoes?.map((execucao: any) => (
              <div key={`${fonte.id}-${execucao.id}`} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--linha)', padding: '0.5rem 0' }}>
                <div><strong>{fonte.nome}</strong><div className="discreto">{execucao.status ?? 'EM_ANDAMENTO'} · {execucao.itens_coletados} itens</div></div>
                <div className="discreto">{execucao.finalizada_em ? new Date(execucao.finalizada_em).toLocaleString('pt-BR') : '—'}</div>
              </div>
            )) ?? [])}
          </div>
        </div>
      </div>
    </section>
  )
}
