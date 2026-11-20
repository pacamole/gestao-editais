import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ConfigSistema } from '../../../../shared/tipos/configSistema'
import { mensagemDeErro } from '../../../api/cliente'
import { configSistema } from '../../../api/configSistema'

type Props = {
  config: ConfigSistema
  salvando: boolean
  onConfig: (config: ConfigSistema) => void
}

export function CardConexoesIa({ config, salvando, onConfig }: Props) {
  const [id, setId] = useState(config.ia_api_selecionada)
  const [nome, setNome] = useState('')
  const [url, setUrl] = useState('')
  const [chave, setChave] = useState('')
  const [modelo, setModelo] = useState(config.ia_api_modelo)
  const [modelos, setModelos] = useState<string[]>([])
  const [carregandoModelos, setCarregandoModelos] = useState(false)
  const [salvandoConexao, setSalvandoConexao] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null)
  const requisicaoModelos = useRef(0)

  useEffect(() => {
    const selecionada = config.ia_api_conexoes.find((conexao) => conexao.id === config.ia_api_selecionada)
    if (selecionada) {
      setId(selecionada.id)
      setNome(selecionada.nome)
      setUrl(selecionada.url)
      setModelo(config.ia_api_modelo)
    }
  }, [config.ia_api_conexoes, config.ia_api_modelo, config.ia_api_selecionada])

  useEffect(() => {
    const numero = ++requisicaoModelos.current
    const urlAtual = url.trim()
    if (!urlAtual || (!chave.trim() && !id)) {
      setModelos([])
      setCarregandoModelos(false)
      return
    }

    setModelos([])
    setModelo('')
    setCarregandoModelos(true)
    setAviso((atual) => atual?.tipo === 'erro' ? null : atual)
    const temporizador = window.setTimeout(async () => {
      try {
        const resultado = await configSistema.listarModelosIa({
          ...(id ? { id } : {}),
          url: urlAtual,
          chave: chave || undefined,
        })
        if (requisicaoModelos.current !== numero) return
        setModelos(resultado.modelos)
        const modeloSalvo = config.ia_api_selecionada === id ? config.ia_api_modelo : ''
        setModelo(resultado.modelos.includes(modeloSalvo) ? modeloSalvo : resultado.modelos[0] ?? '')
      } catch (erro) {
        if (requisicaoModelos.current === numero) {
          setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível carregar os modelos.') })
        }
      } finally {
        if (requisicaoModelos.current === numero) setCarregandoModelos(false)
      }
    }, 650)

    return () => window.clearTimeout(temporizador)
  }, [chave, config.ia_api_modelo, config.ia_api_selecionada, id, url])

  function editar(conexaoId: string) {
    setAviso(null)
    setChave('')
    if (!conexaoId) {
      setId('')
      setNome('')
      setUrl('')
      setModelo('')
      setModelos([])
      return
    }
    const conexao = config.ia_api_conexoes.find((item) => item.id === conexaoId)
    if (!conexao) return
    setId(conexao.id)
    setNome(conexao.nome)
    setUrl(conexao.url)
    setModelo('')
  }

  async function salvarConexao(e: FormEvent) {
    e.preventDefault()
    setAviso(null)
    setSalvandoConexao(true)
    try {
      const resultado = await configSistema.salvarConexaoIa({ id: id || undefined, nome, url, chave: chave || undefined, modelo })
      onConfig(resultado.config)
      setId(resultado.conexaoId)
      setChave('')
      setAviso({ tipo: 'sucesso', texto: `${nome} · ${modelo} salvo e já está em uso.` })
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível salvar a conexão.') })
    } finally {
      setSalvandoConexao(false)
    }
  }

  async function usarConexao() {
    if (!id || !modelo) return
    setAviso(null)
    setSalvandoConexao(true)
    try {
      const { config: atualizada } = await configSistema.salvar({
        ollama_modo: 'NUVEM',
        ia_api_selecionada: id,
        ia_api_modelo: modelo,
      })
      onConfig(atualizada)
      setAviso({ tipo: 'sucesso', texto: `${nome} · ${modelo} agora está em uso.` })
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível ativar a conexão.') })
    } finally {
      setSalvandoConexao(false)
    }
  }

  async function removerConexao() {
    if (!id || !window.confirm(`Remover a conexão "${nome}"?`)) return
    setAviso(null)
    setSalvandoConexao(true)
    try {
      const { config: atualizada } = await configSistema.removerConexaoIa(id)
      onConfig(atualizada)
      editar('')
      setAviso({ tipo: 'sucesso', texto: 'Conexão removida.' })
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível remover a conexão.') })
    } finally {
      setSalvandoConexao(false)
    }
  }

  const conexaoAtual = config.ia_api_conexoes.find((conexao) => conexao.id === id)
  const alterada = Boolean(conexaoAtual && (conexaoAtual.nome !== nome || conexaoAtual.url !== url)) || Boolean(chave.trim())
  const estaEmUso = id === config.ia_api_selecionada && config.ollama_modo === 'NUVEM' && !alterada

  return (
    <form className="card" onSubmit={salvarConexao}>
      <div className="card__cabecalho"><h2>Conexões de IA por API</h2></div>
      <div className="card__corpo pilha">
        <p className="suave">
          Cadastre provedores com API compatível com OpenAI. As chaves ficam cifradas no banco e não são exibidas novamente.
          O modelo disponível é atualizado automaticamente quando a conexão ou a chave muda.
        </p>

        <div className="campo">
          <label htmlFor="ia_conexao">IA conectada</label>
          <select id="ia_conexao" className="select" value={id} onChange={(e) => editar(e.target.value)}>
            <option value="">Nova conexão…</option>
            {config.ia_api_conexoes.map((conexao) => (
              <option key={conexao.id} value={conexao.id}>{conexao.nome}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="ia_nome">Nome do provedor</label>
          <input id="ia_nome" className="input" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: OpenAI, OpenRouter, provedor interno" />
        </div>

        <div className="campo">
          <label htmlFor="ia_url">URL base da API</label>
          <input id="ia_url" className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
          <span className="campo__ajuda">Use a URL HTTPS base de uma API compatível com OpenAI, sem /models ou /chat/completions.</span>
        </div>

        <div className="campo">
          <label htmlFor="ia_api_chave">Chave de API</label>
          <input
            id="ia_api_chave"
            className="input"
            type="password"
            autoComplete="new-password"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder={id ? '•••••••• (mantida se vazio)' : 'Cole a chave de API'}
          />
        </div>

        <div className="campo">
          <label htmlFor="ia_api_modelo">Modelo</label>
          <select
            id="ia_api_modelo"
            className="select"
            value={modelo}
            disabled={!modelos.length || carregandoModelos}
            onChange={(e) => setModelo(e.target.value)}
          >
            {!modelos.length ? <option value="">{carregandoModelos ? 'Carregando modelos…' : 'Informe a URL e a chave para listar modelos'}</option> : null}
            {modelos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {aviso ? <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p> : null}
      </div>
      <div className="card__rodape linha linha--entre">
        <div className="linha">
          <button type="submit" className="btn btn--primario" disabled={salvando || salvandoConexao || carregandoModelos || !nome.trim() || !url.trim() || !modelo || (!id && !chave.trim())}>
            {salvandoConexao ? 'Salvando…' : 'Salvar e usar esta IA'}
          </button>
          <button type="button" className="btn" disabled={salvando || salvandoConexao || carregandoModelos || !id || !modelo || alterada} onClick={usarConexao}>
            {salvandoConexao ? 'Aguarde…' : estaEmUso ? 'Em uso' : alterada ? 'Salve antes de usar' : 'Usar esta IA'}
          </button>
        </div>
        {id ? <button type="button" className="btn btn--sm" disabled={salvando || salvandoConexao} onClick={removerConexao}>Remover</button> : null}
      </div>
    </form>
  )
}
