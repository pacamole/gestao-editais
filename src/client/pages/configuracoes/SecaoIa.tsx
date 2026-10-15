import { useEffect, useState, type FormEvent } from 'react'
import type { ConfigSistema, TestarOllamaResposta } from '../../../shared/tipos/configSistema'
import { mensagemDeErro } from '../../api/cliente'
import { configSistema } from '../../api/configSistema'

type Aviso = { tipo: 'sucesso' | 'atencao' | 'erro'; texto: string } | null

function avisoDoTeste(r: TestarOllamaResposta, modelo: string): Aviso {
  if (r.modelo_disponivel) return { tipo: 'sucesso', texto: `Conectado a ${r.url}. Modelo ${modelo} instalado.` }
  const instalados = r.modelos.length ? r.modelos.join(', ') : 'nenhum'
  return {
    tipo: 'atencao',
    texto: `Conectado a ${r.url}, mas o modelo ${modelo} não está instalado (instalados: ${instalados}). Rode "ollama pull ${modelo}".`,
  }
}

export function SecaoIa() {
  const [config, setConfig] = useState<ConfigSistema | null>(null)
  const [url, setUrl] = useState('')
  const [aviso, setAviso] = useState<Aviso>(null)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  useEffect(() => {
    configSistema
      .obter()
      .then(({ config }) => {
        setConfig(config)
        setUrl(config.ollama_url)
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar a configuração.') }))
  }, [])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    setAviso(null)
    try {
      const resposta = await configSistema.salvar({ ollama_url: url })
      setConfig(resposta.config)
      setUrl(resposta.config.ollama_url)
      setAviso({ tipo: 'sucesso', texto: 'URL do Ollama salva.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Erro ao salvar a URL.') })
    } finally {
      setSalvando(false)
    }
  }

  // Testa o que está no campo, mesmo antes de salvar.
  async function testar() {
    if (!config) return
    setTestando(true)
    setAviso(null)
    try {
      setAviso(avisoDoTeste(await configSistema.testarOllama(url || undefined), config.ollama_modelo))
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível testar a conexão.') })
    } finally {
      setTestando(false)
    }
  }

  if (!config) {
    return aviso ? <p className="aviso aviso--erro" role="alert">{aviso.texto}</p> : <p>Carregando…</p>
  }

  return (
    <div className="pilha">
      {aviso ? <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p> : null}

      <form className="card" onSubmit={salvar}>
        <div className="card__cabecalho"><h2>Servidor Ollama</h2></div>
        <div className="card__corpo pilha">
          <div className="campo">
            <label htmlFor="ollama_url">URL</label>
            <input
              id="ollama_url"
              className="input"
              placeholder={config.ollama_url_padrao}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <span className="campo__ajuda">Vazio usa o padrão ({config.ollama_url_padrao}).</span>
          </div>
          <div className="campo">
            <span className="campo__rotulo">Modelo</span>
            <span><code>{config.ollama_modelo}</code> <span className="discreto">— fixo no sistema</span></span>
          </div>
        </div>
        <div className="card__rodape">
          <button className="btn" type="button" onClick={testar} disabled={testando}>
            {testando ? 'Testando…' : 'Testar conexão'}
          </button>
          <button className="btn btn--primario" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
