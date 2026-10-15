import { useState } from 'react'
import type { TabelaResumo, TesteNuvemResposta } from '../../../../shared/api'
import { base } from '../../../api/base'
import { mensagemDeErro } from '../../../api/cliente'

const LINK_TURSO = 'https://turso.tech'

type Props = {
  resumoLocal: string // "13 editais · 3 usuários …" da base deste computador
  resumir: (tabelas: TabelaResumo[]) => string
  onConectado: () => void
}

// Conectar a uma base no Turso: passo a passo, URL + token, teste e a decisão sobre os dados.
export function CardTurso({ resumoLocal, resumir, onConectado }: Props) {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [teste, setTeste] = useState<TesteNuvemResposta | null>(null)
  const [enviarDados, setEnviarDados] = useState(true)
  const [ocupado, setOcupado] = useState<'testando' | 'conectando' | null>(null)
  const [erro, setErro] = useState('')

  const preenchido = Boolean(url.trim() && token.trim())

  async function testar() {
    setOcupado('testando')
    setErro('')
    setTeste(null)
    try {
      setTeste(await base.testarNuvem({ url: url.trim(), token: token.trim() }))
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível testar a conexão.'))
    } finally {
      setOcupado(null)
    }
  }

  async function conectar() {
    setOcupado('conectando')
    setErro('')
    try {
      await base.conectarNuvem({ url: url.trim(), token: token.trim(), enviarDadosLocais: teste?.situacao === 'VAZIA' && enviarDados })
      onConectado()
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível conectar.'))
      setOcupado(null)
    }
  }

  const podeConectar = teste?.situacao === 'VAZIA' || teste?.situacao === 'COM_DADOS'

  return (
    <div className="card">
      <div className="card__cabecalho"><h2>Base na nuvem (Turso)</h2></div>
      <div className="card__corpo pilha">
        <p className="suave">
          Todos os computadores conectados à mesma base veem e editam os mesmos dados, na hora. Precisa de internet e de uma
          conta gratuita no Turso.
        </p>

        <details className="ajuda-senha" open>
          <summary>Como criar a base e o token</summary>
          <ol>
            <li>
              Crie uma conta em{' '}
              <a href={LINK_TURSO} target="_blank" rel="noreferrer">
                turso.tech ↗
              </a>
              .
            </li>
            <li>No painel, crie um banco de dados (por exemplo, "editais-i9").</li>
            <li>
              Abra o banco e copie a <strong>URL</strong> (começa com <code>libsql://</code>).
            </li>
            <li>
              Em <strong>Create Token</strong>, gere um token com permissão de leitura e escrita e copie.
            </li>
          </ol>
          <p>Os outros computadores da equipe usam a mesma URL e o mesmo token.</p>
        </details>

        <div className="campo">
          <label htmlFor="turso_url">URL do banco</label>
          <input
            id="turso_url"
            className="input"
            placeholder="libsql://editais-i9-suaconta.turso.io"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setTeste(null)
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor="turso_token">Token</label>
          <input
            id="turso_token"
            className="input"
            type="password"
            autoComplete="new-password"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setTeste(null)
            }}
          />
          <span className="campo__ajuda">Fica guardado só neste computador e nunca volta para a tela.</span>
        </div>

        {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}

        {teste?.situacao === 'SEM_CONEXAO' ? (
          <p className="aviso aviso--erro" role="status">Não foi possível conectar. Confira a URL e a internet.</p>
        ) : null}
        {teste?.situacao === 'TOKEN_RECUSADO' ? (
          <p className="aviso aviso--erro" role="status">O Turso recusou o token. Gere um novo, com permissão de leitura e escrita.</p>
        ) : null}
        {teste?.situacao === 'SCHEMA_DIFERENTE' ? (
          <p className="aviso aviso--erro" role="status">
            A base na nuvem foi criada por outra versão do sistema. Atualize o sistema em todos os computadores ou use outro banco.
          </p>
        ) : null}

        {teste?.situacao === 'VAZIA' ? (
          <div className="aviso aviso--sucesso pilha pilha--sm" role="status">
            <strong>Conectado. A base na nuvem está vazia.</strong>
            <label className="checkbox">
              <input type="radio" name="turso_dados" checked={enviarDados} onChange={() => setEnviarDados(true)} />
              Enviar os dados deste computador ({resumoLocal})
            </label>
            <label className="checkbox">
              <input type="radio" name="turso_dados" checked={!enviarDados} onChange={() => setEnviarDados(false)} />
              Começar vazia (será preciso criar uma conta)
            </label>
          </div>
        ) : null}

        {teste?.situacao === 'COM_DADOS' ? (
          <div className="aviso aviso--sucesso pilha pilha--sm" role="status">
            <strong>Conectado. A base na nuvem já tem dados: {resumir(teste.tabelas ?? [])}.</strong>
            <span>
              Este computador passa a usar esses dados. A base deste computador não é apagada: dá para voltar a ela depois.
            </span>
          </div>
        ) : null}

        <p className="discreto">
          Os PDFs dos editais ficam no computador que os coletou; os textos e análises ficam na base e aparecem para todos.
        </p>
      </div>
      <div className="card__rodape">
        <button type="button" className="btn" disabled={!preenchido || ocupado !== null} onClick={testar}>
          {ocupado === 'testando' ? 'Testando…' : 'Testar conexão'}
        </button>
        <button type="button" className="btn btn--primario" disabled={!podeConectar || ocupado !== null} onClick={conectar}>
          {ocupado === 'conectando' ? 'Conectando…' : 'Usar a base na nuvem'}
        </button>
      </div>
    </div>
  )
}
