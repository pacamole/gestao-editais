import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ConfigSistema, ModoOllama, TestarOllamaEntrada } from '../../../shared/tipos/configSistema'
import { mensagemDeErro } from '../../api/cliente'
import { configSistema } from '../../api/configSistema'
import { CardConexoesIa } from './ia/CardConexoesIa'
import { PainelStatus, type Verificacao } from './ia/PainelStatus'

type Aviso = { tipo: 'sucesso' | 'atencao' | 'erro'; texto: string } | null

const ROTULO_MODO: Record<ModoOllama, string> = { LOCAL: 'Neste computador', NUVEM: 'Conexões de IA por API' }

export function SecaoIa() {
  const [config, setConfig] = useState<ConfigSistema | null>(null)
  const [modo, setModo] = useState<ModoOllama>('LOCAL') // aba escolhida; vale depois de salvar
  const [urlLocal, setUrlLocal] = useState('')
  const [limiteChat, setLimiteChat] = useState('')
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [salvando, setSalvando] = useState(false)

  const verificar = useCallback(async (entrada: TestarOllamaEntrada = {}) => {
    setVerificacao({ estado: 'verificando' })
    try {
      const resultado = await configSistema.testarOllama(entrada)
      setVerificacao({ estado: 'pronto', resultado, em: new Date() })
    } catch (e) {
      setVerificacao({ estado: 'erro', mensagem: mensagemDeErro(e, 'Não foi possível verificar.') })
    }
  }, [])

  function aplicar(c: ConfigSistema) {
    setConfig(c)
    setUrlLocal(c.ollama_url)
    setModo(c.ollama_modo)
    setLimiteChat(String(c.chat_limite_diario))
  }

  // Abre já verificando o que está salvo.
  useEffect(() => {
    configSistema
      .obter()
      .then(({ config }) => {
        aplicar(config)
        if (config.ollama_modo === 'LOCAL' || (config.ollama_chave_definida && !config.ia_api_selecionada)) verificar()
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar a configuração.') }))
  }, [verificar])

  // depois: o que verificar ao salvar (false = nada).
  async function salvar(dados: Parameters<typeof configSistema.salvar>[0], sucesso: string, depois: TestarOllamaEntrada | false) {
    setSalvando(true)
    setAviso(null)
    try {
      const { config } = await configSistema.salvar(dados)
      aplicar(config)
      setAviso({ tipo: 'sucesso', texto: sucesso })
      if (depois) verificar(depois)
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Erro ao salvar.') })
    } finally {
      setSalvando(false)
    }
  }

  const testarNuvem = () => verificar({ modo: 'NUVEM', modelo: config?.ollama_modelo_nuvem || undefined })

  // Trocar de aba só verifica; a escolha vale ao salvar (nuvem) ou ao clicar em "Usar este computador".
  function escolherModo(novo: ModoOllama) {
    setModo(novo)
    setAviso(null)
    if (novo === 'LOCAL') verificar({ modo: 'LOCAL' })
    else if (config?.ia_api_selecionada) setVerificacao(null)
    else if (config?.ollama_chave_definida) testarNuvem()
    else setVerificacao(null)
  }

  if (!config) {
    return aviso ? <p className="aviso aviso--erro" role="alert">{aviso.texto}</p> : <p>Carregando…</p>
  }

  const modoPendente = modo !== config.ollama_modo
  const nuvemAtiva = config.ollama_modo === 'NUVEM'

  return (
    <div className="pilha">
      {aviso ? (
        <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      ) : null}

      <div className="campo">
        <span className="campo__rotulo" id="modo_ia">Onde a IA roda</span>
        <div className="segmentado" role="radiogroup" aria-labelledby="modo_ia">
          {(['LOCAL', 'NUVEM'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => escolherModo(m)}>
              {ROTULO_MODO[m]}
              {config.ollama_modo === m ? ' · em uso' : ''}
            </button>
          ))}
        </div>
      </div>

      {modoPendente && modo === 'LOCAL' ? (
        <div className="aviso aviso--atencao linha linha--entre">
          <span>Hoje a IA usa {config.ia_api_selecionada ? 'uma conexão por API' : 'uma conexão de IA na nuvem'}.</span>
          <button
            type="button"
            className="btn btn--sm btn--primario"
            disabled={salvando}
            onClick={() => salvar({ ollama_modo: 'LOCAL' }, 'A IA agora roda neste computador.', { modo: 'LOCAL' })}
          >
            Usar este computador
          </button>
        </div>
      ) : null}

      {modo === 'NUVEM' ? (
        <div className="pilha">
          {config.ollama_chave_definida && !config.ia_api_selecionada ? (
            <p className="aviso aviso--atencao">
              A conexão de IA na nuvem configurada anteriormente continua salva. Para usar outro provedor, cadastre uma conexão de IA por API abaixo.
            </p>
          ) : null}
          <CardConexoesIa
            config={config}
            salvando={salvando}
            onConfig={(atualizada) => {
              setConfig(atualizada)
              setModo(atualizada.ollama_modo)
              if (atualizada.ia_api_selecionada) setVerificacao(null)
            }}
          />
        </div>
      ) : null}

      {modo === 'LOCAL' || (verificacao && !config.ia_api_selecionada) ? (
        <PainelStatus
          modo={modo}
          modelo={config.ollama_modelo}
          verificacao={verificacao}
          onVerificar={() =>
            modo === 'LOCAL' ? verificar({ modo: 'LOCAL' }) : testarNuvem()
          }
        />
      ) : null}

      <div className="card">
        <div className="card__cabecalho"><h2>O que a IA faz no sistema</h2></div>
        <div className="card__corpo pilha">
          <ul className="usos-ia">
            <li>
              <strong>Preenche os dados do edital</strong>
              <span className="suave">Lê o PDF ou a página e completa órgão, prazos, valores e requisitos.</span>
            </li>
            <li>
              <strong>Responde perguntas sobre o edital</strong>
              <span className="suave">Chat na página de cada edital.</span>
            </li>
          </ul>
          <p className="discreto">
            {nuvemAtiva
              ? config.ia_api_selecionada
                ? `Com ${config.ia_api_conexoes.find((item) => item.id === config.ia_api_selecionada)?.nome ?? 'a conexão selecionada'}, os dados dos editais são enviados ao provedor para análise.`
                : 'Com a conexão de IA na nuvem, o texto dos editais é enviado ao provedor conectado para ser analisado.'
              : 'Tudo roda neste computador: o texto dos editais não é enviado para serviços externos.'}
          </p>
        </div>
      </div>

      <form
        className="card"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          salvar({ chat_limite_diario: Number(limiteChat) }, 'Limite do chat salvo.', false)
        }}
      >
        <div className="card__cabecalho"><h2>Chat</h2></div>
        <div className="card__corpo">
          <div className="campo">
            <label htmlFor="ia_limite">Perguntas por usuário por dia</label>
            <input
              id="ia_limite"
              className="input alerta__numero"
              type="number"
              min={1}
              max={500}
              value={limiteChat}
              onChange={(e) => setLimiteChat(e.target.value)}
            />
            <span className="campo__ajuda">Evita que o chat ocupe o computador o dia todo. Vale para cada usuário.</span>
          </div>
        </div>
        <div className="card__rodape">
          <button className="btn btn--primario" type="submit" disabled={salvando || String(config.chat_limite_diario) === limiteChat}>
            Salvar
          </button>
        </div>
      </form>

      {modo === 'LOCAL' ? (
        <details className="ajuda-senha avancado-ia">
          <summary>Configuração avançada</summary>
          <form
            className="pilha"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              salvar({ ollama_url: urlLocal }, 'Endereço do Ollama salvo.', { modo: 'LOCAL' })
            }}
          >
            <div className="campo">
              <label htmlFor="ia_url_local">Endereço do Ollama</label>
              <input
                id="ia_url_local"
                className="input"
                placeholder={config.ollama_url_padrao}
                value={urlLocal}
                onChange={(e) => setUrlLocal(e.target.value)}
              />
              <span className="campo__ajuda">
                Só mude se o Ollama estiver em outro computador da rede. Vazio usa {config.ollama_url_padrao}.
              </span>
            </div>
            <p className="discreto">
              Modelo usado: <code>{config.ollama_modelo}</code> (definido pelo sistema).
            </p>
            <div className="linha">
              <button type="button" className="btn" onClick={() => verificar({ modo: 'LOCAL', url: urlLocal || undefined })}>
                Testar
              </button>
              <button className="btn btn--primario" type="submit" disabled={salvando}>
                Salvar
              </button>
            </div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
