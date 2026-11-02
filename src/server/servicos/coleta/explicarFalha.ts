import { ErroModeloLinguagem } from '../../portas/ModeloLinguagemPorta.js'

// Erros técnicos da busca numa fonte, traduzidos para o que o usuário entende e pode fazer.
export function explicarFalhaColeta(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  if (erro instanceof ErroModeloLinguagem) return `A IA não respondeu (${mensagem}). Confira Configurações › IA.`
  if (/HTTP (404|410)\b/.test(mensagem)) return 'A página não existe mais (erro 404). Confira se o endereço da fonte mudou.'
  if (/HTTP (401|403)\b/.test(mensagem)) return 'O site recusou o acesso automático (erro 403). Esta fonte não pode ser monitorada.'
  if (/HTTP 429\b/.test(mensagem)) return 'O site pediu para esperar (muitos acessos). A busca será feita de novo no próximo horário.'
  if (/HTTP 5\d\d\b/.test(mensagem)) return 'O site está fora do ar no momento. A busca será feita de novo no próximo horário.'
  if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONN|timeout|aborted/i.test(mensagem)) {
    return 'Não foi possível acessar o site (sem resposta). Confira o endereço da fonte e a conexão com a internet.'
  }
  if (/excede 25 MB/.test(mensagem)) return 'O documento tem mais de 25 MB; envie-o por Nova entrada se quiser analisá-lo.'
  return mensagem
}
