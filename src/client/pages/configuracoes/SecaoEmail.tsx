import { useEffect, useState, type FormEvent } from 'react'
import {
  NOME_REMETENTE_PADRAO,
  PROVEDORES_EMAIL,
  provedorDoServidor,
  type IdProvedor,
} from '../../../shared/provedoresEmail'
import type { ConfigSistema } from '../../../shared/tipos/configSistema'
import { mensagemDeErro } from '../../api/cliente'
import { configSistema } from '../../api/configSistema'

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null

// Estado do formulário; senha vazia = mantém a atual. Servidor e porta só são editados em "Outro".
type FormEmail = { provedor: IdProvedor; host: string; porta: string; conta: string; senha: string; nome: string }

const OPCOES_PROVEDOR: { id: IdProvedor; rotulo: string }[] = [
  { id: 'DESLIGADO', rotulo: 'Desligado' },
  { id: 'GMAIL', rotulo: PROVEDORES_EMAIL.GMAIL.nome },
  { id: 'OUTLOOK', rotulo: PROVEDORES_EMAIL.OUTLOOK.nome },
  { id: 'OUTRO', rotulo: 'Outro' },
]

function paraForm(config: ConfigSistema): FormEmail {
  return {
    provedor: provedorDoServidor(config.smtp_host, config.smtp_porta),
    host: config.smtp_host,
    porta: String(config.smtp_porta),
    conta: config.smtp_usuario,
    senha: '',
    nome: config.smtp_nome_remetente,
  }
}

// Servidor e porta que serão gravados, conforme o provedor escolhido.
function servidor(form: FormEmail): { host: string; porta: number } {
  if (form.provedor === 'DESLIGADO') return { host: '', porta: Number(form.porta) || 465 }
  if (form.provedor === 'OUTRO') return { host: form.host.trim(), porta: Number(form.porta) }
  const { host, porta } = PROVEDORES_EMAIL[form.provedor]
  return { host, porta }
}

export function SecaoEmail() {
  const [config, setConfig] = useState<ConfigSistema | null>(null)
  const [form, setForm] = useState<FormEmail | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [salvando, setSalvando] = useState(false)
  const [destino, setDestino] = useState('')
  const [testando, setTestando] = useState(false)
  const [avisoTeste, setAvisoTeste] = useState<Aviso>(null)

  useEffect(() => {
    configSistema
      .obter()
      .then(({ config }) => {
        setConfig(config)
        setForm(paraForm(config))
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar a configuração de e-mail.') }))
  }, [])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!form) return
    setSalvando(true)
    setAviso(null)
    try {
      const { host, porta } = servidor(form)
      const resposta = await configSistema.salvar({
        smtp_host: host,
        smtp_porta: porta,
        smtp_usuario: form.conta,
        smtp_senha: form.senha || undefined,
        smtp_nome_remetente: form.nome,
      })
      setConfig(resposta.config)
      setForm(paraForm(resposta.config))
      setAviso({ tipo: 'sucesso', texto: host ? 'Configuração de e-mail salva.' : 'Envio de e-mail desligado.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Erro ao salvar a configuração de e-mail.') })
    } finally {
      setSalvando(false)
    }
  }

  async function testar(evento: FormEvent) {
    evento.preventDefault()
    setTestando(true)
    setAvisoTeste(null)
    try {
      await configSistema.testarEmail(destino)
      setAvisoTeste({ tipo: 'sucesso', texto: `E-mail de teste enviado para ${destino}.` })
    } catch (e) {
      setAvisoTeste({ tipo: 'erro', texto: mensagemDeErro(e, 'Falha ao enviar o e-mail de teste.') })
    } finally {
      setTestando(false)
    }
  }

  if (!form || !config) {
    return aviso ? <p className="aviso aviso--erro" role="alert">{aviso.texto}</p> : <p>Carregando…</p>
  }

  const alterar = (campo: keyof FormEmail) => (e: { target: { value: string } }) => setForm({ ...form, [campo]: e.target.value })
  const ligado = form.provedor !== 'DESLIGADO'
  const preset = form.provedor === 'GMAIL' || form.provedor === 'OUTLOOK' ? PROVEDORES_EMAIL[form.provedor] : null
  const exemploConta = form.provedor === 'OUTLOOK' ? 'alertas.empresa@outlook.com' : 'alertas.empresa@gmail.com'

  return (
    <div className="pilha">
      {!config.smtp_host ? (
        <p className="aviso aviso--atencao">Envio desligado: os e-mails de alerta são apenas impressos no terminal do servidor.</p>
      ) : null}
      {aviso ? <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p> : null}

      <form className="card" onSubmit={salvar}>
        <div className="card__cabecalho"><h2>Conta que envia os alertas</h2></div>
        <div className="card__corpo pilha">
          <div className="campo">
            <span className="campo__rotulo" id="provedor_rotulo">Provedor</span>
            <div className="segmentado" role="radiogroup" aria-labelledby="provedor_rotulo">
              {OPCOES_PROVEDOR.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={form.provedor === o.id}
                  onClick={() => setForm({ ...form, provedor: o.id })}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
            {preset ? (
              <span className="campo__ajuda">
                Servidor {preset.host}, porta {preset.porta} — já configurados.
              </span>
            ) : null}
          </div>

          {form.provedor === 'OUTRO' ? (
            <div className="grade-2">
              <div className="campo">
                <label htmlFor="smtp_host">Servidor SMTP</label>
                <input id="smtp_host" className="input" placeholder="smtp.seuprovedor.com" value={form.host} onChange={alterar('host')} />
              </div>
              <div className="campo">
                <label htmlFor="smtp_porta">Porta</label>
                <input id="smtp_porta" className="input" type="number" min={1} max={65535} value={form.porta} onChange={alterar('porta')} />
                <span className="campo__ajuda">Normalmente 465 (SSL) ou 587 (STARTTLS).</span>
              </div>
            </div>
          ) : null}

          {ligado ? (
            <>
              <p className="discreto">
                Use uma conta dedicada a enviar os alertas (por exemplo, {exemploConta}), não a conta pessoal de alguém.
                O sistema não entra nessa caixa de e-mail: só envia por ela.
              </p>
              <div className="grade-2">
                <div className="campo">
                  <label htmlFor="smtp_conta">E-mail que envia os alertas</label>
                  <input
                    id="smtp_conta"
                    className="input"
                    type="email"
                    autoComplete="off"
                    placeholder={exemploConta}
                    value={form.conta}
                    onChange={alterar('conta')}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="smtp_senha">Senha de app</label>
                  <input
                    id="smtp_senha"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.smtp_senha_definida ? '•••••••• (mantida se vazio)' : 'Gerada pelo provedor'}
                    value={form.senha}
                    onChange={alterar('senha')}
                  />
                  <span className="campo__ajuda">Não é a senha normal da conta: é uma senha gerada para aplicativos.</span>
                </div>
              </div>

              {preset?.ajudaSenha ? (
                <details className="ajuda-senha">
                  <summary>Como gerar a senha de app no {preset.nome}</summary>
                  <ol>
                    {preset.ajudaSenha.passos.map((passo) => (
                      <li key={passo}>{passo}</li>
                    ))}
                  </ol>
                  <a href={preset.ajudaSenha.url} target="_blank" rel="noreferrer">
                    Abrir a página do {preset.nome} ↗
                  </a>
                </details>
              ) : null}

              <div className="campo">
                <label htmlFor="smtp_nome">Nome exibido no remetente</label>
                <input id="smtp_nome" className="input" placeholder={NOME_REMETENTE_PADRAO} value={form.nome} onChange={alterar('nome')} />
                <span className="campo__ajuda">
                  Quem recebe vê: <strong>{form.nome.trim() || NOME_REMETENTE_PADRAO}</strong> &lt;{form.conta.trim() || exemploConta}&gt;
                </span>
              </div>
            </>
          ) : (
            <p className="discreto">Escolha um provedor para enviar os alertas por e-mail.</p>
          )}
        </div>
        <div className="card__rodape">
          <button className="btn btn--primario" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      <form className="card" onSubmit={testar}>
        <div className="card__cabecalho"><h2>Testar envio</h2></div>
        <div className="card__corpo pilha">
          <p className="discreto">Envia uma mensagem com a configuração salva acima.</p>
          <div className="campo">
            <label htmlFor="smtp_teste">Enviar para</label>
            <input id="smtp_teste" className="input" type="email" required value={destino} onChange={(e) => setDestino(e.target.value)} />
          </div>
          {avisoTeste ? <p className={`aviso aviso--${avisoTeste.tipo}`} role="status">{avisoTeste.texto}</p> : null}
        </div>
        <div className="card__rodape">
          <button className="btn" type="submit" disabled={testando || !config.smtp_host}>
            {testando ? 'Enviando…' : 'Enviar e-mail de teste'}
          </button>
        </div>
      </form>
    </div>
  )
}
