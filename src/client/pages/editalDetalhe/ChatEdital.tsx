import { useEffect, useState } from 'react'
import { ErroApi, mensagemDeErro } from '../../api/cliente'
import { chat } from '../../api/chat'
import { TextoFormatado } from '../../components/TextoFormatado'
import type { ErroChatDados, MensagemChat } from '../../../shared/tipos/chat'
import { SEM_CONEXAO, mensagemDoServidor, type AoErro } from './util'

const SUGESTOES = [
  'Quais são os requisitos de elegibilidade deste edital?',
  'Quais documentos são exigidos para a inscrição?',
  'Resuma os critérios de avaliação das propostas.',
]

type Props = {
  id: string
  textoDisponivel: boolean
  aoErro: AoErro
}

export function ChatEdital({ id, textoDisponivel, aoErro }: Props) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [pergunta, setPergunta] = useState('')
  const [restantes, setRestantes] = useState(20)
  const [limiteDiario, setLimiteDiario] = useState(20)
  const [enviando, setEnviando] = useState(false)
  const [respostaParcial, setRespostaParcial] = useState('')
  const [statusChat, setStatusChat] = useState('')

  // Histórico é opcional: se falhar, o chat começa vazio.
  useEffect(() => {
    let ativo = true
    chat.historico(id)
      .then((h) => {
        if (!ativo) return
        setMensagens(h.mensagens || [])
        setRestantes(h.restantes ?? 20)
        setLimiteDiario(h.limite ?? 20)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [id])

  async function enviar(sugerida?: string) {
    const texto = (sugerida ?? pergunta).trim()
    if (!texto || enviando) return
    setEnviando(true)
    setRespostaParcial('')
    setStatusChat('Iniciando o chat...')
    aoErro('')
    let textoParcial = ''
    try {
      let concluido = false
      for await (const evento of chat.perguntar(id, texto)) {
        if (evento.tipo === 'status') {
          setStatusChat(evento.mensagem)
        } else if (evento.tipo === 'trecho') {
          setStatusChat('O Gemma está respondendo...')
          textoParcial += evento.conteudo
          setRespostaParcial(textoParcial)
        } else if (evento.tipo === 'erro') {
          throw new Error(evento.mensagem)
        } else if (evento.tipo === 'concluido') {
          setMensagens(evento.mensagens || [])
          setRestantes((atual) => evento.restantes ?? atual)
          setPergunta('')
          setRespostaParcial('')
          setStatusChat('')
          concluido = true
        }
      }
      if (!concluido) throw new Error('A transmissão da resposta foi interrompida. Tente novamente.')
    } catch (erroChat) {
      // Erro antes do stream (ex.: 429) pode trazer quantas perguntas restam.
      if (erroChat instanceof ErroApi) {
        const dados = erroChat.dados as ErroChatDados | null
        if (typeof dados?.restantes === 'number') setRestantes(dados.restantes)
      }
      const mensagem = mensagemDeErro(erroChat, SEM_CONEXAO)
      if (textoParcial) {
        setStatusChat(`A geração foi interrompida antes de concluir. Trecho parcial abaixo (não salvo): ${mensagem}`)
        aoErro('')
      } else {
        setRespostaParcial('')
        setStatusChat('')
        aoErro(mensagem)
      }
    } finally {
      setEnviando(false)
    }
  }

  async function limpar() {
    aoErro('')
    try {
      await chat.limpar(id)
      setMensagens([])
    } catch (erro) {
      aoErro(mensagemDoServidor(erro))
    }
  }

  const bloqueado = !textoDisponivel || enviando || restantes === 0

  return (
    <div className="card detalhe-bloco">
      <div className="card__cabecalho linha linha--entre">
        <div>
          <h2>Chat sobre o edital</h2>
          <small className="discreto">
            {textoDisponivel
              ? `${restantes} de ${limiteDiario} perguntas restantes hoje`
              : 'Este edital não tem texto extraído. Envie o PDF com texto selecionável para habilitar o chat.'}
          </small>
        </div>
        <button
          type="button"
          className="btn btn--sm btn--fantasma"
          onClick={limpar}
          disabled={!textoDisponivel}
        >
          Limpar conversa
        </button>
      </div>
      <div className="card__corpo">
        <div className="pilha">
          <div className="chat-historico">
            {!mensagens.length && (
              <div className="chat-sugestoes">
                <p className="discreto">Perguntas sugeridas:</p>
                <div className="linha" style={{ gap: 'var(--esp-2)', marginTop: 4 }}>
                  {SUGESTOES.map((q) => (
                    <button
                      type="button"
                      className="btn btn--sm"
                      key={q}
                      onClick={() => void enviar(q)}
                      disabled={bloqueado}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`chat-msg chat-msg--${m.papel.toLowerCase()}`}
                style={{
                  padding: '8px 12px',
                  margin: '6px 0',
                  borderRadius: 'var(--raio-2)',
                  background: m.papel === 'USUARIO' ? 'var(--cor-primaria-suave)' : 'var(--cinza-fundo)',
                }}
              >
                <strong>{m.papel === 'USUARIO' ? 'Você' : 'Assistente'}</strong>
                <TextoFormatado texto={m.conteudo} />
              </div>
            ))}
            {(statusChat || respostaParcial) && (
              <div
                className="chat-msg chat-msg--assistente"
                aria-live="polite"
                style={{
                  padding: '8px 12px',
                  margin: '6px 0',
                  borderRadius: 'var(--raio-2)',
                  background: 'var(--cinza-fundo)',
                }}
              >
                <strong>Assistente</strong>
                {statusChat && <p className="discreto">{statusChat}</p>}
                {respostaParcial && <TextoFormatado texto={respostaParcial} />}
              </div>
            )}
          </div>

          <form
            onSubmit={(evento) => {
              evento.preventDefault()
              void enviar()
            }}
            className="linha"
            style={{ marginTop: 'var(--esp-2)' }}
          >
            <input
              className="input"
              style={{ flex: 1 }}
              value={pergunta}
              onChange={(x) => setPergunta(x.target.value)}
              placeholder="Pergunte sobre este edital..."
              disabled={bloqueado}
            />
            <button
              type="submit"
              className="btn btn--primario"
              disabled={bloqueado || !pergunta.trim()}
            >
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
