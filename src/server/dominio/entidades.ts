// Entidades do sistema, como os repositórios as entregam: colunas JSON já convertidas
// em arrays/objetos e colunas 0/1 em boolean. Nomes de campos iguais às colunas (db/schema.sql).
// As entidades expostas pela API vivem em shared/tipos/dominio.ts (fonte única com a interface);
// aqui ficam só as exclusivas do servidor.

import type { Edital } from '../../shared/tipos/dominio.js'

export type * from '../../shared/tipos/dominio.js'

// ---- Acesso ----

export type Usuario = {
  id: string
  nome: string
  email: string
  senha_hash: string
  ativo: boolean
  criado_em: string
}

export type Sessao = {
  id: string
  usuario_id: string
  criada_em: string
  expira_em: string
}

// ---- Editais ----

export type EditalVersao = {
  id: string
  edital_id: string
  hash_documento: string | null
  dados: Edital // snapshot do edital antes da retificação
  criado_em: string
}

// ---- Chat ----

export type Conversa = {
  id: string
  edital_id: string
  usuario_id: string
  criada_em: string
  atualizada_em: string
}

// ---- Configuração ----

export type Config = {
  chave: string
  valor: string
}
