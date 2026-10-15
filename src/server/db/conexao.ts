import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import Libsql from 'libsql'
import type { ModoBase } from '../../shared/api.js'
import { arquivoBanco } from '../config/paths.js'

// O mínimo que o sistema usa de uma conexão SQLite. Cumprido pelo node:sqlite (base local)
// e pelo libsql (base na nuvem, Turso), para o resto do código não saber onde estão os dados.

export type ValorSql = null | number | bigint | string | Uint8Array
export type Linha = Record<string, unknown>

export interface Instrucao {
  run(...parametros: ValorSql[]): { changes: number | bigint }
  get(...parametros: ValorSql[]): Linha | undefined
  all(...parametros: ValorSql[]): Linha[]
}

export interface Conexao {
  prepare(sql: string): Instrucao
  exec(sql: string): void
}

export type { ModoBase }

// Onde ficam os dados, escolhido na tela Configurações › Base de dados.
// Fica num arquivo ao lado do banco (não dentro dele): é preciso saber antes de abrir a conexão.
export type ConfigConexao = { modo: ModoBase; url: string; token: string }

const arquivoConfig = path.join(path.dirname(arquivoBanco), 'base-conexao.json')

export function lerConfigConexao(): ConfigConexao {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivoConfig, 'utf8')) as Partial<ConfigConexao>
    if (dados.modo === 'NUVEM' && dados.url && dados.token) return { modo: 'NUVEM', url: dados.url, token: dados.token }
  } catch {
    // Sem arquivo (ou inválido): base local, como sempre foi.
  }
  return { modo: 'LOCAL', url: '', token: '' }
}

export function salvarConfigConexao(config: ConfigConexao): void {
  fs.mkdirSync(path.dirname(arquivoConfig), { recursive: true })
  fs.writeFileSync(arquivoConfig, JSON.stringify(config, null, 2))
}

export function abrirLocal(arquivo = arquivoBanco): DatabaseSync {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true })
  const conexao = new DatabaseSync(arquivo)
  conexao.exec('PRAGMA journal_mode = WAL')
  conexao.exec('PRAGMA foreign_keys = ON')
  conexao.exec('PRAGMA busy_timeout = 5000')
  return conexao
}

// Opção que o libsql aceita mas os tipos dele (copiados do better-sqlite3) não declaram.
type OpcoesLibsql = Libsql.Options & { authToken?: string }

// O libsql devolve cada linha com uma chave extra `_metadata`, que não é coluna.
function semMetadados(linha: unknown): Linha | undefined {
  if (!linha || typeof linha !== 'object') return undefined
  const { _metadata, ...colunas } = linha as Linha
  return colunas
}

// Erro de rede ao falar com a base na nuvem (o libsql usa o protocolo Hrana sobre HTTP).
export function ehErroDeConexaoNuvem(erro: unknown): boolean {
  return /Hrana|error trying to connect|tcp connect|dns error|timed out/i.test(String((erro as Error)?.message ?? erro))
}

// Embrulha uma conexão libsql com a nuvem na interface do sistema.
// Depois de uma falha de rede o libsql não se recupera: a conexão é descartada e a próxima
// operação abre outra, para o sistema voltar a funcionar sozinho quando a internet voltar.
export class ConexaoLibsql implements Conexao {
  private banco: Libsql.Database | null = null

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private atual(): Libsql.Database {
    this.banco ??= new Libsql(this.url, { authToken: this.token } as OpcoesLibsql)
    return this.banco
  }

  private executar<T>(operacao: () => T): T {
    try {
      return operacao()
    } catch (erro) {
      if (ehErroDeConexaoNuvem(erro)) this.descartar()
      throw erro
    }
  }

  private descartar(): void {
    try {
      this.banco?.close()
    } catch {
      // Já quebrada.
    }
    this.banco = null
  }

  prepare(sql: string): Instrucao {
    const instrucao = this.executar(() => this.atual().prepare(sql))
    return {
      run: (...p) => this.executar(() => instrucao.run(...p)),
      get: (...p) => semMetadados(this.executar(() => instrucao.get(...p))),
      all: (...p) => this.executar(() => instrucao.all(...p)).map((l) => semMetadados(l)!),
    }
  }

  exec(sql: string): void {
    this.executar(() => this.atual().exec(sql))
  }

  close(): void {
    this.descartar()
  }
}

// Conexão direta com a base na nuvem: cada consulta vai ao Turso, então todos os computadores
// veem os mesmos dados na hora. (A réplica embutida do libsql 0.5 deixava de enxergar escritas
// novas depois de sincronizar, por isso não é usada.)
export function abrirRemota(url: string, token: string): ConexaoLibsql {
  const conexao = new ConexaoLibsql(url, token)
  conexao.prepare('SELECT 1').get() // falha já aqui se a URL ou o token estiverem errados
  return conexao
}
