import { useEffect, useState } from 'react'
import type { FonteComExecucoes, TipoFonte } from '../../../shared/tipos/fontes'
import { mensagemDeErro } from '../../api/cliente'
import { fontes as apiFontes } from '../../api/fontes'
import { formatarDataHora } from '../../util/formato'

// Estado do formulário; id '' = nova fonte.
type FormFonte = {
  id: string
  nome: string
  url_base: string
  tipo: TipoFonte
  frequencia_cron: string
  ativo: boolean
}

const fonteInicial: FormFonte = {
  id: '',
  nome: '',
  url_base: '',
  tipo: 'SCRAPER',
  frequencia_cron: '0 6 * * *',
  ativo: true,
}

export function SecaoFontes() {
  const [fontes, setFontes] = useState<FonteComExecucoes[]>([])
  const [form, setForm] = useState(fonteInicial)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  async function carregar() {
    try {
      const resposta = await apiFontes.listar()
      setFontes(resposta.fontes ?? [])
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar as fontes.'))
    }
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    setMensagem('')
    setErro('')
    try {
      // Vazios viram null no servidor; sem id ele gera um novo.
      await apiFontes.salvar({ ...form, id: form.id || undefined })
      setMensagem('Fonte salva com sucesso.')
      setForm(fonteInicial)
      await carregar()
    } catch (e) {
      setErro(mensagemDeErro(e, 'Erro ao salvar fonte.'))
    }
  }

  async function alternarAtivo(id: string) {
    setErro('')
    try {
      await apiFontes.alternarAtivo(id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Erro ao alterar fonte.'))
    }
    carregar()
  }

  async function dispararColeta(id: string) {
    setMensagem('')
    setErro('')
    try {
      await apiFontes.coletar(id)
      setMensagem('Coleta disparada com sucesso.')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Falha ao disparar coleta.'))
    }
    carregar()
  }

  return (
    <section>
      <div className="pilha">
        <div className="card">
          <div className="card__cabecalho"><h2>Nova fonte</h2></div>
          <div className="card__corpo grade-3">
            <div className="campo"><label htmlFor="nome_fonte">Nome</label><input id="nome_fonte" className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="tipo_fonte">Tipo</label><select id="tipo_fonte" className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoFonte })}><option value="SCRAPER">SCRAPER</option><option value="RSS">RSS</option><option value="URL_MANUAL">URL_MANUAL</option><option value="UPLOAD_MANUAL">UPLOAD_MANUAL</option></select></div>
            <div className="campo"><label htmlFor="url_base">URL base</label><input id="url_base" className="input" value={form.url_base} onChange={(e) => setForm({ ...form, url_base: e.target.value })} /></div>
            <div className="campo"><label htmlFor="frequencia_cron">Frequência cron</label><input id="frequencia_cron" className="input" value={form.frequencia_cron} onChange={(e) => setForm({ ...form, frequencia_cron: e.target.value })} /></div>
            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativa</label>
          </div>
          <div className="card__rodape linha linha--entre">
            <button className="btn btn--fantasma" onClick={() => setForm(fonteInicial)}>Limpar</button>
            <button className="btn btn--primario" onClick={salvar}>Salvar fonte</button>
          </div>
          {mensagem ? <div className="card__rodape"><p className="aviso aviso--sucesso">{mensagem}</p></div> : null}
          {erro ? <div className="card__rodape"><p className="aviso aviso--erro" role="alert">{erro}</p></div> : null}
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
                    <td>{formatarDataHora(fonte.ultima_coleta_em)}</td>
                    <td>{fonte.execucoes?.[0]?.itens_coletados ?? 0}</td>
                    <td><span className={`badge badge--${fonte.ultimo_status === 'SUCESSO' ? 'sucesso' : fonte.ultimo_status === 'FALHA' ? 'perigo' : fonte.ultimo_status === 'PARCIAL' ? 'atencao' : 'fantasma'}`}>{fonte.ultimo_status ?? 'Sem execução'}</span></td>
                    <td className="linha">
                      <button className="btn btn--sm btn--fantasma" onClick={() => setForm({ id: fonte.id, nome: fonte.nome, url_base: fonte.url_base ?? '', tipo: fonte.tipo, frequencia_cron: fonte.frequencia_cron ?? '', ativo: fonte.ativo })}>Editar</button>
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
            {fontes.flatMap((fonte) => fonte.execucoes?.map((execucao) => (
              <div key={`${fonte.id}-${execucao.id}`} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--linha)', padding: '0.5rem 0' }}>
                <div><strong>{fonte.nome}</strong><div className="discreto">{execucao.status ?? 'EM_ANDAMENTO'} · {execucao.itens_coletados} itens</div></div>
                <div className="discreto">{formatarDataHora(execucao.finalizada_em)}</div>
              </div>
            )) ?? [])}
          </div>
        </div>
      </div>
    </section>
  )
}
