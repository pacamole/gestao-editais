import type { SQLInputValue } from 'node:sqlite'
import { agora, db, novoId } from '../db/index.js'

// Campos que aceitam null podem ser omitidos na inserção.
type ChavesNulaveis<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T]

/** Dados para inserir: obrigatórios os campos não nulos, exceto os `Opcionais` (id, carimbos de data, defaults do banco). */
export type Entrada<T, Opcionais extends keyof T> = Omit<T, ChavesNulaveis<T> | Opcionais> &
  Partial<Pick<T, ChavesNulaveis<T> | Opcionais>>

const NOME_COLUNA = /^[a-z_][a-z0-9_]*$/

/**
 * Acesso a uma tabela. Converte entre a linha do SQLite e a entidade:
 * colunas JSON <-> arrays/objetos, colunas 0/1 <-> boolean.
 *
 * @typeParam T         entidade
 * @typeParam Id        tipo da chave primária
 * @typeParam Opcionais campos preenchidos automaticamente na inserção
 */
export abstract class Repositorio<T extends object, Id extends string | number = string, Opcionais extends keyof T = never> {
  protected abstract readonly tabela: string
  protected readonly chave: keyof T & string = 'id' as keyof T & string
  // Gera uuid para a chave quando não informada na inserção.
  protected readonly gerarId: boolean = true
  protected readonly colunasJson: readonly (keyof T & string)[] = []
  protected readonly colunasBooleanas: readonly (keyof T & string)[] = []
  // Preenchidas com o instante atual na inserção (ambas) e na atualização (só a de atualização).
  protected readonly colunaCriacao: (keyof T & string) | null = null
  protected readonly colunaAtualizacao: (keyof T & string) | null = null
  protected readonly ordemPadrao: string | null = null

  buscarPorId(id: Id): T | undefined {
    return this.consultarUm(`SELECT * FROM ${this.tabela} WHERE ${this.chave} = ?`, id)
  }

  listar(): T[] {
    const ordem = this.ordemPadrao ? ` ORDER BY ${this.ordemPadrao}` : ''
    return this.consultar(`SELECT * FROM ${this.tabela}${ordem}`)
  }

  contar(): number {
    return this.contarOnde('1 = 1')
  }

  inserir(dados: Entrada<T, Opcionais>): T {
    const registro: Record<string, unknown> = { ...dados }
    if (this.gerarId && registro[this.chave] === undefined) registro[this.chave] = novoId()
    const instante = agora()
    if (this.colunaCriacao) registro[this.colunaCriacao] ??= instante
    if (this.colunaAtualizacao) registro[this.colunaAtualizacao] ??= instante

    const linha = this.paraLinha(registro)
    const colunas = Object.keys(linha)
    db.prepare(
      `INSERT INTO ${this.tabela} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
    ).run(...Object.values(linha))
    return this.buscarPorId(registro[this.chave] as Id)!
  }

  /** Atualiza só os campos informados. Devolve a entidade atualizada, ou undefined se não existir. */
  atualizar(id: Id, alteracoes: Partial<T>): T | undefined {
    const registro: Record<string, unknown> = { ...alteracoes }
    delete registro[this.chave]
    if (this.colunaAtualizacao) registro[this.colunaAtualizacao] ??= agora()

    const linha = this.paraLinha(registro)
    const colunas = Object.keys(linha)
    if (colunas.length) {
      db.prepare(`UPDATE ${this.tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')} WHERE ${this.chave} = ?`).run(
        ...Object.values(linha),
        id,
      )
    }
    return this.buscarPorId(id)
  }

  excluir(id: Id): boolean {
    return this.executar(`DELETE FROM ${this.tabela} WHERE ${this.chave} = ?`, id) > 0
  }

  // ---- Apoio às subclasses ----

  protected consultar(sql: string, ...params: SQLInputValue[]): T[] {
    return db
      .prepare(sql)
      .all(...params)
      .map((linha) => this.paraEntidade(linha))
  }

  protected consultarUm(sql: string, ...params: SQLInputValue[]): T | undefined {
    const linha = db.prepare(sql).get(...params)
    return linha ? this.paraEntidade(linha) : undefined
  }

  protected contarOnde(condicao: string, ...params: SQLInputValue[]): number {
    return this.escalar(`SELECT COUNT(*) FROM ${this.tabela} WHERE ${condicao}`, ...params)
  }

  /** Primeira coluna da primeira linha, como número (COUNT, SUM…). */
  protected escalar(sql: string, ...params: SQLInputValue[]): number {
    const linha = db.prepare(sql).get(...params)
    return linha ? Number(Object.values(linha)[0] ?? 0) : 0
  }

  /** Executa um comando (DELETE, UPDATE, upsert) e devolve quantas linhas foram afetadas. */
  protected executar(sql: string, ...params: SQLInputValue[]): number {
    return Number(db.prepare(sql).run(...params).changes)
  }

  protected static marcadores(valores: readonly unknown[]): string {
    return valores.map(() => '?').join(', ')
  }

  private paraEntidade(linha: Record<string, unknown>): T {
    const entidade: Record<string, unknown> = { ...linha }
    for (const coluna of this.colunasJson) {
      const valor = entidade[coluna]
      entidade[coluna] = valor === null ? null : JSON.parse(String(valor))
    }
    for (const coluna of this.colunasBooleanas) {
      const valor = entidade[coluna]
      entidade[coluna] = valor === null ? null : valor === 1
    }
    return entidade as T
  }

  private paraLinha(registro: Record<string, unknown>): Record<string, SQLInputValue> {
    const linha: Record<string, SQLInputValue> = {}
    for (const [coluna, valor] of Object.entries(registro)) {
      if (valor === undefined) continue
      // Nomes de coluna entram no SQL: nunca aceitar chave arbitrária (ex.: vinda de req.body).
      if (!NOME_COLUNA.test(coluna)) throw new Error(`Coluna inválida: ${coluna}`)
      if (valor === null) linha[coluna] = null
      else if ((this.colunasJson as readonly string[]).includes(coluna)) linha[coluna] = JSON.stringify(valor)
      else if (typeof valor === 'boolean') linha[coluna] = valor ? 1 : 0
      else linha[coluna] = valor as SQLInputValue
    }
    return linha
  }
}
