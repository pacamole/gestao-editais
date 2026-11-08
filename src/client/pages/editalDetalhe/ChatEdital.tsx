import { useEffect, useState } from 'react'
import { ErroApi, mensagemDeErro } from '../../api/cliente'
import { chat } from '../../api/chat'
import { edital as apiEdital } from '../../api/edital'
import { TextoFormatado } from '../../components/TextoFormatado'
import type { ErroChatDados, MensagemChat, SugestaoCorrecaoChat } from '../../../shared/tipos/chat'
import type { CampoEditavel } from '../../../shared/tipos/edital'
import { CAMPOS_EDITAL } from '../../../shared/rotulos'
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
  aoAtualizar: () => Promise<void>
}

const valorTexto = (valor: unknown) => Array.isArray(valor) ? valor.join(', ') : valor == null ? 'Não localizado' : String(valor)

export function ChatEdital({ id, textoDisponivel, aoErro, aoAtualizar }: Props) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [pergunta, setPergunta] = useState('')
  const [restantes, setRestantes] = useState(20)
  const [limiteDiario, setLimiteDiario] = useState(20)
  const [enviando, setEnviando] = useState(false)
  const [respostaParcial, setRespostaParcial] = useState('')
  const [statusChat, setStatusChat] = useState('')
  const [sugestoes, setSugestoes] = useState<SugestaoCorrecaoChat[]>([])
  const [camposSelecionados, setCamposSelecionados] = useState<Set<CampoEditavel>>(new Set())
  const [aplicandoSugestoes, setAplicandoSugestoes] = useState(false)
  const [feedbackSugestoes, setFeedbackSugestoes] = useState('')

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
    setSugestoes([])
    setCamposSelecionados(new Set())
    setFeedbackSugestoes('')
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
          setSugestoes(evento.sugestoes ?? [])
          setCamposSelecionados(new Set())
          setFeedbackSugestoes(evento.avisoSugestoes ? `Não foi possível verificar correções: ${evento.avisoSugestoes}` : '')
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

  async function aplicarCorrecoes() {
    const campos: Partial<Record<CampoEditavel, string | number | boolean | string[] | null>> = {}
    for (const sugestao of sugestoes) {
      if (camposSelecionados.has(sugestao.campo)) campos[sugestao.campo] = sugestao.valor
    }
    if (!Object.keys(campos).length || aplicandoSugestoes) return
    setAplicandoSugestoes(true)
    setFeedbackSugestoes('')
    aoErro('')
    try {
      const resultado = await apiEdital.salvarCampos(id, campos)
      setFeedbackSugestoes(resultado.mensagem)
      setSugestoes([])
      setCamposSelecionados(new Set())
      await aoAtualizar()
    } catch (erro) {
      aoErro(mensagemDeErro(erro, SEM_CONEXAO))
    } finally {
      setAplicandoSugestoes(false)
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
            {sugestoes.length > 0 && (
              <section className="card" aria-label="Correções sugeridas pela IA">
                <div className="card__corpo pilha">
                  <h3>Possíveis correções nos dados do edital</h3>
                  <p className="discreto">A IA encontrou possíveis divergências. Marque as correções que você autoriza salvar.</p>
                  {sugestoes.map((sugestao) => (
                    <label className="checkbox" key={sugestao.campo}>
                      <input
                        type="checkbox"
                        checked={camposSelecionados.has(sugestao.campo)}
                        onChange={(evento) => {
                          const selecionados = new Set(camposSelecionados)
                          if (evento.target.checked) selecionados.add(sugestao.campo)
                          else selecionados.delete(sugestao.campo)
                          setCamposSelecionados(selecionados)
                        }}
                      />
                      <span>
                        <strong>{CAMPOS_EDITAL[sugestao.campo].rotulo}</strong>: {valorTexto(sugestao.valor)}
                        <br />{sugestao.justificativa}
                        {sugestao.evidencia && <><br /><em>“{sugestao.evidencia}”</em></>}
                      </span>
                    </label>
                  ))}
                  <button type="button" className="btn btn--sucesso" onClick={() => void aplicarCorrecoes()} disabled={!camposSelecionados.size || aplicandoSugestoes}>
                    {aplicandoSugestoes ? 'Salvando...' : 'Autorizar e salvar selecionados'}
                  </button>
                </div>
              </section>
            )}
            {feedbackSugestoes && <p className="aviso" role="status">{feedbackSugestoes}</p>}
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
