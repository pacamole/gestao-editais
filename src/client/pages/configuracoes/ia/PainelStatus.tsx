import { useState, type ReactNode } from 'react'
import type { ModoOllama, TestarOllamaResposta } from '../../../../shared/tipos/configSistema'

export const LINK_DOWNLOAD_OLLAMA = 'https://ollama.com/download'
const TAMANHO_MODELO = 'cerca de 5 GB'

export type Verificacao =
  | { estado: 'verificando' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'pronto'; resultado: TestarOllamaResposta; em: Date }

type Props = {
  modo: ModoOllama
  modelo: string // do modo local
  verificacao: Verificacao | null
  onVerificar: () => void
}

type EstadoPasso = 'feito' | 'atual' | 'pendente'

const hostDe = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function Comando({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sem permissão de área de transferência: o texto continua selecionável.
    }
  }
  return (
    <div className="comando">
      <code>{texto}</code>
      <button type="button" className="btn btn--sm" onClick={copiar}>
        {copiado ? 'Copiado ✓' : 'Copiar'}
      </button>
    </div>
  )
}

function Passo({ numero, titulo, estado, children }: { numero: number; titulo: string; estado: EstadoPasso; children?: ReactNode }) {
  const icone = estado === 'feito' ? '✓' : estado === 'atual' ? '!' : String(numero)
  return (
    <li className={`passo passo--${estado}`}>
      <span className="passo__icone" aria-hidden="true">{icone}</span>
      <div className="passo__conteudo">
        <strong>
          {numero}. {titulo}
          <span className="sr-only"> — {estado === 'feito' ? 'concluído' : estado === 'atual' ? 'pendente, faça agora' : 'pendente'}</span>
        </strong>
        {estado === 'atual' ? children : null}
      </div>
    </li>
  )
}

// Guia para o Ollama neste computador: o primeiro passo pendente fica aberto.
function GuiaLocal({ semConexao, modelo }: { semConexao: boolean; modelo: string }) {
  return (
    <ol className="passos">
      <Passo numero={1} titulo="Instalar e abrir o Ollama" estado={semConexao ? 'atual' : 'feito'}>
        <p>Programa gratuito que roda a IA no próprio computador. Instale e deixe-o aberto (ele fica perto do relógio).</p>
        <a className="btn btn--sm btn--primario" href={LINK_DOWNLOAD_OLLAMA} target="_blank" rel="noreferrer">
          Baixar o Ollama ↗
        </a>
      </Passo>
      <Passo numero={2} titulo="Baixar o modelo de IA" estado={semConexao ? 'pendente' : 'atual'}>
        <p>Abra o terminal (no Windows, "Prompt de Comando") e rode:</p>
        <Comando texto={`ollama pull ${modelo}`} />
        <p className="discreto">O download tem {TAMANHO_MODELO} e é feito uma vez só.</p>
      </Passo>
      <Passo numero={3} titulo="Pronto" estado="pendente" />
    </ol>
  )
}

export function PainelStatus({ modo, modelo, verificacao, onVerificar }: Props) {
  const verificando = verificacao?.estado === 'verificando'
  const resultado = verificacao?.estado === 'pronto' ? verificacao.resultado : null
  const ok = resultado?.situacao === 'OK'

  let titulo = 'Verificando…'
  let detalhe: ReactNode = 'Conferindo se a IA está respondendo.'
  let corpo: ReactNode = null

  if (verificacao?.estado === 'erro') {
    titulo = 'Não foi possível verificar'
    detalhe = verificacao.mensagem
  } else if (resultado && modo === 'NUVEM') {
    switch (resultado.situacao) {
      case 'OK':
        titulo = 'Funcionando'
        detalhe = `Ollama Cloud · modelo ${resultado.modelo}`
        break
      case 'SEM_CHAVE':
        titulo = 'Falta a chave de API'
        detalhe = 'Cole a chave de API da sua conta Ollama e escolha o modelo.'
        break
      case 'ACESSO_NEGADO':
        titulo = 'Chave recusada'
        detalhe = 'O Ollama Cloud recusou a chave de API. Confira se ela foi copiada inteira ou gere uma nova.'
        break
      case 'SEM_MODELO':
        titulo = 'Escolha o modelo'
        detalhe = resultado.modelo
          ? `O modelo ${resultado.modelo} não está mais disponível no Ollama Cloud. Escolha outro na lista.`
          : 'Escolha na lista qual modelo de IA usar.'
        break
      case 'SEM_CONEXAO':
        titulo = 'Não está funcionando'
        detalhe = 'Não foi possível falar com o Ollama Cloud. Confira a internet e tente de novo.'
        break
    }
  } else if (resultado) {
    const host = hostDe(resultado.url)
    switch (resultado.situacao) {
      case 'OK':
        titulo = 'Funcionando'
        detalhe = `Ollama neste computador (${host}) · modelo ${modelo} instalado`
        break
      case 'SEM_CONEXAO':
      case 'SEM_CHAVE':
      case 'ACESSO_NEGADO':
        titulo = 'Não está funcionando'
        detalhe = 'O Ollama não respondeu. Siga os passos abaixo e clique em Verificar.'
        corpo = <GuiaLocal semConexao modelo={modelo} />
        break
      case 'SEM_MODELO':
        titulo = 'Falta o modelo de IA'
        detalhe = 'O Ollama está rodando, mas ainda falta baixar o modelo.'
        corpo = (
          <>
            <GuiaLocal semConexao={false} modelo={modelo} />
            <p className="discreto">Modelos já baixados: {resultado.modelos.length ? resultado.modelos.join(', ') : 'nenhum'}.</p>
          </>
        )
        break
    }
  }

  const classe = verificando || !verificacao ? 'status-ia' : ok ? 'status-ia status-ia--ok' : 'status-ia status-ia--erro'

  return (
    <div className={`card ${classe}`} role="status" aria-live="polite">
      <div className="card__corpo pilha">
        <div className="linha linha--entre">
          <div className="pilha pilha--sm">
            <strong className="status-ia__titulo">{titulo}</strong>
            <span className="suave">{detalhe}</span>
            {verificacao?.estado === 'pronto' ? <span className="discreto">Verificado às {hora(verificacao.em)}</span> : null}
          </div>
          <button type="button" className="btn" onClick={onVerificar} disabled={verificando}>
            {verificando ? 'Verificando…' : '↻ Verificar'}
          </button>
        </div>
        {corpo}
      </div>
    </div>
  )
}
