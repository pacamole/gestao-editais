import { ErroApi } from '../../api/cliente'

// Texto exibido para campos que a extração não encontrou.
export const NAO_LOCALIZADO = 'Não localizado no documento'

export const SEM_CONEXAO = 'Não foi possível conectar ao servidor.'

// Erro do servidor mostra a mensagem dele; falha de rede mostra o aviso de conexão.
export function mensagemDoServidor(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : SEM_CONEXAO
}

// Avisa a página para exibir (ou limpar, com '') o erro no topo.
export type AoErro = (mensagem: string) => void
