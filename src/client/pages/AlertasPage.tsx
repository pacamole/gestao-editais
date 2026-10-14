import { useEffect, useState } from 'react'
import type { ConfigAlerta, NotificacaoLog, TipoNotificacao } from '../../shared/tipos/alertas'
import { alertas } from '../api/alertas'
import { mensagemDeErro } from '../api/cliente'
import { formatarDataHora } from '../util/formato'

export function AlertasPage() {
  const [configs, setConfigs] = useState<ConfigAlerta[]>([])
  const [logs, setLogs] = useState<NotificacaoLog[]>([])
  const [erro, setErro] = useState('')

  async function carregar() {
    const resposta = await alertas.listar()
    setConfigs(resposta.configuracoes ?? [])
    setLogs(resposta.logs ?? [])
  }

  useEffect(() => {
    carregar().catch((e) => setErro(mensagemDeErro(e, 'Não foi possível carregar os alertas.')))
  }, [])

  function atualizarConfig(tipo: TipoNotificacao, chave: string, valor: string | boolean) {
    setConfigs((atual) => atual.map((config) => {
      if (config.tipo !== tipo) return config
      const parametros = { ...config.parametros }
      if (typeof valor === 'boolean') parametros[chave] = valor
      else parametros[chave] = String(valor)
      return { ...config, parametros }
    }))
  }

  async function salvar(tipo: TipoNotificacao) {
    const config = configs.find((item) => item.tipo === tipo)
    if (!config) return

    setErro('')
    try {
      await alertas.salvar({
        tipo,
        ativo: Boolean(config.ativo),
        destinatarios: config.destinatarios ?? [],
        parametros: config.parametros ?? {},
      })
      await carregar()
    } catch (e) {
      setErro(mensagemDeErro(e, 'Erro ao salvar alerta.'))
    }
  }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Configurações de alerta</h1>
          <p>Ativação, destinatários e parâmetros dos gatilhos do sistema.</p>
        </div>
      </header>

      <div className="pilha">
        {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}
        {configs.map((config) => (
          <div key={config.tipo} className="card">
            <div className="card__cabecalho linha linha--entre">
              <h2>{config.tipo} · {config.tipo === 'E01' ? 'Novo edital com fit alto' : config.tipo === 'E02' ? 'Prazo próximo' : config.tipo === 'E03' ? 'Verificação necessária' : config.tipo === 'E04' ? 'Resumo semanal' : config.tipo === 'E05' ? 'Edital retificado' : 'Falha de coleta'}</h2>
              <label className="checkbox"><input type="checkbox" checked={Boolean(config.ativo)} onChange={(e) => setConfigs((atual) => atual.map((item) => item.tipo === config.tipo ? { ...item, ativo: e.target.checked } : item))} /> Ativo</label>
            </div>
            <div className="card__corpo grade-2">
              <div className="campo"><label>Destinatários</label><input className="input" value={(config.destinatarios ?? []).join(', ')} onChange={(e) => setConfigs((atual) => atual.map((item) => item.tipo === config.tipo ? { ...item, destinatarios: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : item))} /></div>
              {Object.entries(config.parametros ?? {}).map(([chave, valor]) => (
                <div key={`${config.tipo}-${chave}`} className="campo">
                  <label>{chave}</label>
                  <input className="input" value={String(valor ?? '')} onChange={(e) => atualizarConfig(config.tipo, chave, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="card__rodape"><button className="btn btn--primario" onClick={() => salvar(config.tipo)}>Salvar {config.tipo}</button></div>
          </div>
        ))}

        <div className="card">
          <div className="card__cabecalho"><h2>Central de notificações</h2></div>
          <div className="card__corpo">
            {logs.length ? logs.map((item) => (
              <div key={item.id} className="linha" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--linha)', padding: '0.5rem 0' }}>
                <div>
                  <strong>{item.tipo}</strong>
                  <div className="discreto">{item.assunto}</div>
                </div>
                <div className="discreto">{formatarDataHora(item.enviado_em)}</div>
              </div>
            )) : <p className="discreto">Nenhuma notificação enviada até o momento.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
