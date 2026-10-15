import { useEffect, useState, type FormEvent } from 'react'
import type { ConfigSistema } from '../../../shared/tipos/configSistema'
import { mensagemDeErro } from '../../api/cliente'
import { configSistema } from '../../api/configSistema'

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null

// Estado do formulário; senha vazia = mantém a atual.
type FormSmtp = { host: string; porta: string; usuario: string; senha: string; remetente: string }

function paraForm(config: ConfigSistema): FormSmtp {
  return {
    host: config.smtp_host,
    porta: String(config.smtp_porta),
    usuario: config.smtp_usuario,
    senha: '',
    remetente: config.smtp_remetente,
  }
}

export function SecaoEmail() {
  const [config, setConfig] = useState<ConfigSistema | null>(null)
  const [form, setForm] = useState<FormSmtp | null>(null)
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
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar o SMTP.') }))
  }, [])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!form) return
    setSalvando(true)
    setAviso(null)
    try {
      const resposta = await configSistema.salvar({
        smtp_host: form.host,
        smtp_porta: Number(form.porta),
        smtp_usuario: form.usuario,
        smtp_senha: form.senha || undefined,
        smtp_remetente: form.remetente,
      })
      setConfig(resposta.config)
      setForm(paraForm(resposta.config))
      setAviso({ tipo: 'sucesso', texto: 'Configuração de e-mail salva.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Erro ao salvar o SMTP.') })
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

  const alterar = (campo: keyof FormSmtp) => (e: { target: { value: string } }) => setForm({ ...form, [campo]: e.target.value })

  return (
    <div className="pilha">
      {!config.smtp_host ? (
        <p className="aviso aviso--atencao">SMTP desligado: os e-mails de alerta são apenas impressos no terminal do servidor.</p>
      ) : null}
      {aviso ? <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p> : null}

      <form className="card" onSubmit={salvar}>
        <div className="card__cabecalho"><h2>Servidor SMTP</h2></div>
        <div className="card__corpo grade-2">
          <div className="campo">
            <label htmlFor="smtp_host">Servidor</label>
            <input id="smtp_host" className="input" placeholder="smtp.gmail.com" value={form.host} onChange={alterar('host')} />
            <span className="campo__ajuda">Deixe vazio para desligar o envio.</span>
          </div>
          <div className="campo">
            <label htmlFor="smtp_porta">Porta</label>
            <input id="smtp_porta" className="input" type="number" min={1} max={65535} value={form.porta} onChange={alterar('porta')} />
            <span className="campo__ajuda">465 usa conexão segura (SSL); 587 usa STARTTLS.</span>
          </div>
          <div className="campo">
            <label htmlFor="smtp_usuario">Usuário</label>
            <input id="smtp_usuario" className="input" autoComplete="off" value={form.usuario} onChange={alterar('usuario')} />
          </div>
          <div className="campo">
            <label htmlFor="smtp_senha">Senha</label>
            <input
              id="smtp_senha"
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder={config.smtp_senha_definida ? '•••••••• (mantida se vazio)' : ''}
              value={form.senha}
              onChange={alterar('senha')}
            />
          </div>
          <div className="campo">
            <label htmlFor="smtp_remetente">Remetente</label>
            <input
              id="smtp_remetente"
              className="input"
              placeholder={form.usuario ? `Editais I9+ <${form.usuario}>` : 'Editais I9+ <alertas@empresa.com>'}
              value={form.remetente}
              onChange={alterar('remetente')}
            />
          </div>
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
