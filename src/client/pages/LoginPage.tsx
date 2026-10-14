
  import { useState, type FormEvent } from 'react'
  import { useNavigate } from 'react-router'
  import { auth } from '../api/auth'
  import { mensagemDeErro } from '../api/cliente'
  import '../styles/autenticacao.css'

  export function LoginPage() {
    const navigate = useNavigate()

    // Estados do formulário
    const [cadastro, setCadastro] = useState(false)
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [confirmacao, setConfirmacao] = useState('')
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState('')
    const [carregando, setCarregando] = useState(false)

    // Alterna entre login e criação de conta
    function trocarModo() {
      setCadastro(!cadastro)
      setErro('')
      setSucesso('')
      setSenha('')
      setConfirmacao('')
    }

    // Envia os dados para o servidor
    async function enviar(evento: FormEvent<HTMLFormElement>) {
      evento.preventDefault()
      setErro('')
      setSucesso('')

      if (cadastro && senha !== confirmacao) {
        setErro('As senhas não coincidem.')
        return
      }

      if (cadastro && senha.length < 8) {
        setErro('A senha precisa ter pelo menos 8 caracteres.')
        return
      }

      setCarregando(true)

      try {
        if (cadastro) {
          await auth.cadastrar({ nome, email, senha })
          setCadastro(false)
          setSenha('')
          setConfirmacao('')
          setSucesso(
            'Conta criada com sucesso! Agora entre com seus dados.'
          )
        } else {
          await auth.entrar({ email, senha })
          navigate('/', { replace: true })
        }

      } catch (e) {
        setErro(mensagemDeErro(e, 'Erro de conexão com o servidor.'))
      } finally {
        setCarregando(false)
      }
    }

    return (
      <main className="auth-pagina">

        {/* Lado esquerdo: apresentação */}
        <section className="auth-apresentacao">

          <div className="auth-marca">
            <span className="auth-marca-icone">✦</span>
            I9+ <span>EDITAIS</span>
          </div>

          <div className="auth-apresentacao-conteudo">

            <div className="auth-etiqueta">
              INTELIGÊNCIA EM OPORTUNIDADES
            </div>

            <h1>
              O próximo passo da sua inovação começa aqui.
            </h1>

            <p>
              Descubra oportunidades, analise editais e acompanhe
              suas decisões em um só lugar.
            </p>

            <div className="auth-destaques">
              <span>✓ Gestão centralizada</span>
              <span>✓ Análise inteligente</span>
              <span>✓ Decisões mais rápidas</span>
            </div>

          </div>

          <small>
            Plataforma de Gestão de Editais • I9+
          </small>

        </section>

        {/* Lado direito: login e cadastro */}
        <section className="auth-formulario-area">

          <div className="auth-card">

            <div className="auth-icone">✦</div>

            <div className="auth-etiqueta auth-etiqueta--escura">
              BEM-VINDO À I9+
            </div>

            <h2>
              {cadastro ? 'Crie sua conta' : 'Acesse sua conta'}
            </h2>

            <p className="auth-subtitulo">
              {cadastro
                ? 'Preencha seus dados para começar a utilizar a plataforma.'
                : 'Entre com seu e-mail e senha para continuar.'}
            </p>

            <form
              onSubmit={enviar}
              className="auth-formulario"
            >

              {/* Nome aparece apenas no cadastro */}
              {cadastro && (
                <label>
                  Nome completo
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                  />
                </label>
              )}

              {/* Campo de e-mail */}
              <label>
                E-mail
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>

              {/* Campo de senha */}
              <label>
                Senha

                <div className="auth-senha">

                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={cadastro ? 8 : undefined}
                    autoComplete={
                      cadastro
                        ? 'new-password'
                        : 'current-password'
                    }
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    aria-label={
                      mostrarSenha
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                  </button>

                </div>
              </label>

              {/* Confirmação aparece no cadastro */}
              {cadastro && (
                <label>
                  Confirmar senha

                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    value={confirmacao}
                    onChange={e => setConfirmacao(e.target.value)}
                  />

                </label>
              )}

              {/* Mensagens de erro e sucesso */}
              {erro && (
                <p
                  className="auth-alerta auth-alerta--erro"
                  role="alert"
                >
                  {erro}
                </p>
              )}

              {sucesso && (
                <p
                  className="auth-alerta auth-alerta--sucesso"
                  role="status"
                >
                  {sucesso}
                </p>
              )}

              {/* Botão principal */}
              <button
                className="auth-enviar"
                type="submit"
                disabled={carregando}
              >
                {carregando
                  ? 'Aguarde...'
                  : cadastro
                    ? 'Criar minha conta →'
                    : 'Entrar na plataforma →'}
              </button>

            </form>
  {/* Botão para alternar entre login e cadastro */}
            <div className="auth-acoes">

              <p>
                {cadastro
                  ? 'Já possui uma conta?'
                  : 'Ainda não tem uma conta?'}
              </p>

              <button
                className="auth-botao-cadastro"
                type="button"
                onClick={trocarModo}
              >
                {cadastro ? 'Voltar para login' : 'Criar conta'}
              </button>

            </div>

          </div>

        </section>

      </main>
    )
  }
