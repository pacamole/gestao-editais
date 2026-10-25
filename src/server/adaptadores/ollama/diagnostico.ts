import type { ModoOllama, SituacaoOllama } from '../../../shared/tipos/configSistema.js'
import { cabecalhosOllama, enderecoOllama, type ConexaoOllama } from './conexao.js'

const TIMEOUT_TESTE_OLLAMA_MS = 5_000
const TIMEOUT_TESTE_NUVEM_MS = 20_000

// Confere se o Ollama responde, se aceita a chave e se o modelo está disponível.
export async function diagnosticarOllama(
  modo: ModoOllama,
  conexao: ConexaoOllama,
): Promise<{ situacao: SituacaoOllama; modelos: string[] }> {
  if (modo === 'NUVEM' && !conexao.chave) return { situacao: 'SEM_CHAVE', modelos: [] }

  const chamar = (caminho: string, init: RequestInit = {}) =>
    fetch(enderecoOllama(conexao, caminho), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...cabecalhosOllama(conexao) },
      signal: AbortSignal.timeout(modo === 'NUVEM' ? TIMEOUT_TESTE_NUVEM_MS : TIMEOUT_TESTE_OLLAMA_MS),
    })

  let tags: Response
  try {
    tags = await chamar('/api/tags')
  } catch {
    return { situacao: 'SEM_CONEXAO', modelos: [] }
  }
  if (tags.status === 401 || tags.status === 403) return { situacao: 'ACESSO_NEGADO', modelos: [] }
  if (!tags.ok) return { situacao: 'SEM_CONEXAO', modelos: [] }

  const dados = (await tags.json().catch(() => ({}))) as { models?: { name?: string }[] }
  const modelos = (dados.models ?? []).map((m) => m.name ?? '').filter(Boolean)
  if (!conexao.modelo || !modelos.includes(conexao.modelo)) return { situacao: 'SEM_MODELO', modelos }
  if (modo === 'LOCAL') return { situacao: 'OK', modelos }

  // No Ollama Cloud a lista de modelos é pública: só uma chamada de verdade (1 token) prova que a chave vale.
  try {
    const chat = await chamar('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: conexao.modelo,
        stream: false,
        messages: [{ role: 'user', content: 'Responda apenas: ok' }],
        options: { num_predict: 1 },
      }),
    })
    if (chat.status === 401 || chat.status === 403) return { situacao: 'ACESSO_NEGADO', modelos }
    return { situacao: chat.ok ? 'OK' : 'SEM_CONEXAO', modelos }
  } catch {
    return { situacao: 'SEM_CONEXAO', modelos }
  }
}
