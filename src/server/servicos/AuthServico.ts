import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { ErroConflito, ErroNaoAutenticado, ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import type { UsuarioLogado } from '../../shared/tipos/auth.js'

type RepositoriosAuth = Pick<Repositorios, 'usuario' | 'sessao' | 'destinatario'>

type DadosCadastro = { nome: string; email: string; senha: string }

export const DURACAO_SESSAO_SEGUNDOS = 8 * 3600

// Usado quando a requisição não traz sessão e nem há usuário cadastrado.
const USUARIO_PADRAO_ID = '00000000-0000-0000-0000-000000000001'
const MENSAGEM_CADASTRO_INVALIDO = 'Informe nome válido, e-mail válido e senha de 8 a 128 caracteres.'

const scryptAsync = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>
const TAMANHO_HASH = 64

// Dados de cadastro normalizados, ou null se inválidos.
function lerCadastro(corpo: unknown): DadosCadastro | null {
  const dados = (corpo ?? {}) as Record<string, unknown>
  const nome = String(dados.nome ?? '').trim()
  const email = String(dados.email ?? '').trim().toLowerCase()
  const senha = String(dados.senha ?? '')
  const valido =
    nome.length >= 2 &&
    nome.length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254 &&
    senha.length >= 8 &&
    senha.length <= 128
  return valido ? { nome, email, senha } : null
}

// Contas, senhas e sessões. Todo usuário tem acesso total.
export class AuthServico {
  constructor(private readonly repos: RepositoriosAuth) {}

  // ---- Casos de uso ----

  async cadastrar(corpo: unknown): Promise<void> {
    const dados = lerCadastro(corpo)
    if (!dados) throw new ErroValidacao(MENSAGEM_CADASTRO_INVALIDO)

    if (this.repos.usuario.buscarPorEmail(dados.email)) throw new ErroConflito('Este e-mail já está cadastrado.')

    const senha_hash = await this.gerarHash(dados.senha)
    try {
      this.repos.usuario.criar({ nome: dados.nome, email: dados.email, senha_hash })
      // Toda conta nova passa a receber alertas; dá para tirar na lista de destinatários.
      this.repos.destinatario.adicionar(dados.email)
    } catch {
      throw new ErroConflito('Não foi possível cadastrar este e-mail.')
    }
  }

  /** Confere e-mail e senha e abre uma sessão; devolve o token. Mesma mensagem para qualquer falha. */
  async entrar(email: unknown, senha: unknown): Promise<string> {
    const usuario = this.repos.usuario.buscarPorEmail(String(email || '').trim())
    if (!usuario?.ativo || !(await this.conferirSenha(String(senha || ''), usuario.senha_hash))) {
      throw new ErroNaoAutenticado('E-mail ou senha inválidos.')
    }
    return this.repos.sessao.inserir({
      usuario_id: usuario.id,
      expira_em: new Date(Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000).toISOString(),
    }).id
  }
/**
 * Tarefa 4: atualização dos dados pessoais da conta.
 * Exige a senha atual, inclusive quando apenas o nome é alterado.
 */
async atualizarConta(
  token: string | undefined,
  corpo: unknown
): Promise<UsuarioLogado> {
  // Identifica a conta por meio da sessão atual.
  const id = this.usuarioIdDaSessao(token)

  if (!id) {
    throw new ErroNaoAutenticado('Faça login para editar sua conta.')
  }

  // Busca o usuário registrado no banco de dados.
  const usuario = this.repos.usuario.buscarPorId(id)

  if (!usuario?.ativo) {
    throw new ErroNaoAutenticado('Usuário não encontrado.')
  }

  const dados = (corpo ?? {}) as Record<string, unknown>

  // Verifica os valores recebidos.
  const nome = typeof dados.nome === 'string'
    ? dados.nome.trim()
    : ''

  const senhaAtual = typeof dados.senhaAtual === 'string'
    ? dados.senhaAtual
    : ''

  const novaSenha = typeof dados.novaSenha === 'string'
    ? dados.novaSenha
    : ''

  // Valida o nome.
  if (nome.length < 2 || nome.length > 100) {
    throw new ErroValidacao('O nome deve ter entre 2 e 100 caracteres.')
  }

  // Confirma que a senha atual pertence ao usuário.
  if (!(await this.conferirSenha(senhaAtual, usuario.senha_hash))) {
    throw new ErroValidacao('Senha atual incorreta.')
  }

  // Se houver nova senha, valida seu tamanho.
  if (novaSenha && (novaSenha.length < 8 || novaSenha.length > 128)) {
    throw new ErroValidacao(
      'A nova senha deve ter entre 8 e 128 caracteres.'
    )
  }

  // Gera um novo hash apenas quando a senha é alterada.
  const senha_hash = novaSenha
    ? await this.gerarHash(novaSenha)
    : undefined

  // Salva as alterações no repositório.
  this.repos.usuario.atualizarConta(id, { nome, senha_hash })

  return {
    nome,
    email: usuario.email
  }
}


  sair(token: string | undefined): void {
    if (token) this.repos.sessao.excluir(token)
  }

  /** Quem está logado (mostrado na barra lateral). Sem sessão válida, 401. */
  usuarioLogado(token: string | undefined): UsuarioLogado {
    const usuarioId = this.usuarioIdDaSessao(token)
    const usuario = usuarioId ? this.repos.usuario.buscarPorId(usuarioId) : undefined
    if (!usuario) throw new ErroNaoAutenticado('Sessão inexistente ou expirada.', { autenticado: false })
    return { nome: usuario.nome, email: usuario.email }
  }

  // ---- Identificação do usuário em cada requisição ----

  /** Id do dono de uma sessão válida (não expirada), ou null. */
  usuarioIdDaSessao(token: string | undefined): string | null {
    if (!token) return null
    return this.repos.sessao.buscarValida(token, new Date().toISOString())?.usuario_id ?? null
  }

  /** Usuário da requisição; sem sessão válida, cai no primeiro usuário ativo (ou num id fixo). */
  usuarioIdOuPadrao(token: string | undefined): string {
    return this.usuarioIdDaSessao(token) ?? this.repos.usuario.primeiroAtivo()?.id ?? USUARIO_PADRAO_ID
  }

  // ---- Senhas ----

  // Formato armazenado: "scrypt$<sal hex>$<hash hex>"
  private async gerarHash(senha: string): Promise<string> {
    const sal = randomBytes(16)
    const hash = await scryptAsync(senha, sal, TAMANHO_HASH)
    return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`
  }

  private async conferirSenha(senha: string, armazenado: string): Promise<boolean> {
    const [algoritmo, salHex, hashHex] = armazenado.split('$')
    if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false
    const esperado = Buffer.from(hashHex, 'hex')
    const hash = await scryptAsync(senha, Buffer.from(salHex, 'hex'), esperado.length)
    return timingSafeEqual(hash, esperado)
  }
}
