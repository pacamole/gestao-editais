// Cliente HTTP único da interface: monta JSON, extrai { erro } e trata sessão expirada.

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly dados: unknown = null,
  ) {
    super(message)
    this.name = 'ErroApi'
  }
}

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  corpo?: unknown
  // Parâmetros de query; vazios (undefined, null, '') são omitidos.
  query?: Record<string, string | number | boolean | null | undefined>
  // Por padrão, 401 leva ao login. Desligue nas rotas de autenticação.
  redirecionarSe401?: boolean
  sinal?: AbortSignal
}

export function montarUrl(caminho: string, query?: Opcoes['query']): string {
  if (!query) return caminho
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query)) {
    if (valor === undefined || valor === null || valor === '') continue
    params.set(chave, String(valor))
  }
  const texto = params.toString()
  return texto ? `${caminho}?${texto}` : caminho
}

export function irParaLogin() {
  if (window.location.pathname !== '/login') window.location.assign('/login')
}

// Faz a requisição e devolve a Response crua (para streaming e casos especiais).
export async function requisicaoBruta(caminho: string, opcoes: Opcoes = {}): Promise<Response> {
  const { metodo = 'GET', corpo, query, redirecionarSe401 = true, sinal } = opcoes
  const resposta = await fetch(montarUrl(caminho, query), {
    method: metodo,
    credentials: 'include',
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: sinal,
  })

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    if (resposta.status === 401 && redirecionarSe401) irParaLogin()
    const mensagem =
      dados && typeof dados === 'object' && 'erro' in dados && typeof dados.erro === 'string'
        ? dados.erro
        : `Falha na requisição (${resposta.status}).`
    throw new ErroApi(mensagem, resposta.status, dados)
  }

  return resposta
}

// Requisição JSON tipada. Lança ErroApi com a mensagem do servidor quando !ok.
export async function requisicao<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const resposta = await requisicaoBruta(caminho, opcoes)
  return (await resposta.json()) as T
}

// Mensagem amigável para exibir na tela a partir de qualquer erro capturado.
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}
