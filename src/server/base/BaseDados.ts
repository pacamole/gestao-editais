import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { ResultadoExportacao, ResultadoImportacao, TabelaResumo } from '../../shared/api.js'

// Erro de arquivo recebido (inválido, corrompido ou de outro schema). A base atual não é alterada.
export class ErroImportacao extends Error {}

// Tabelas que não viajam entre computadores: sessões de login valem só onde foram criadas.
const TABELAS_LOCAIS = ['sessao']

const APELIDO = 'importada'

/**
 * Exporta a base inteira para um arquivo SQLite e importa a partir de um arquivo exportado.
 *
 * A importação não troca o arquivo do banco: anexa o arquivo recebido (ATTACH) e copia os
 * dados tabela a tabela numa transação. Assim funciona com o servidor rodando e valida
 * tudo antes de tocar na base atual.
 */
export class BaseDados {
  constructor(
    private readonly conexao: DatabaseSync,
    private readonly pastaBackups: string,
  ) {}

  /** Grava uma cópia consistente da base em `destino`, sem as tabelas locais. */
  exportar(destino: string): ResultadoExportacao {
    this.copiar(destino)
    this.anexar(destino)
    try {
      for (const tabela of TABELAS_LOCAIS) this.conexao.exec(`DELETE FROM ${APELIDO}.${tabela}`)
      return { arquivo: destino, tamanhoBytes: fs.statSync(destino).size, tabelas: this.resumir(APELIDO) }
    } finally {
      this.desanexar()
    }
  }

  /**
   * Substitui todos os dados da base atual pelos do arquivo. Antes, grava um backup da
   * base atual em `pastaBackups`. Sessões de login são apagadas (todos entram de novo).
   */
  importar(arquivo: string): ResultadoImportacao {
    if (!fs.existsSync(arquivo)) throw new ErroImportacao(`Arquivo não encontrado: ${arquivo}`)
    this.anexar(arquivo)
    try {
      const tabelas = this.validar()
      const backup = this.fazerBackup()

      // foreign_keys não pode mudar dentro de transação; a integridade já foi checada em validar().
      this.conexao.exec('PRAGMA foreign_keys = OFF')
      try {
        this.conexao.exec('BEGIN')
        try {
          for (const tabela of tabelas) {
            this.conexao.exec(`DELETE FROM main.${tabela}`)
            if (TABELAS_LOCAIS.includes(tabela)) continue
            const colunas = this.colunas('main', tabela).join(', ')
            this.conexao.exec(`INSERT INTO main.${tabela} (${colunas}) SELECT ${colunas} FROM ${APELIDO}.${tabela}`)
          }
          this.conexao.exec('COMMIT')
        } catch (erro) {
          this.conexao.exec('ROLLBACK')
          throw erro
        }
      } finally {
        this.conexao.exec('PRAGMA foreign_keys = ON')
      }

      return { backup, tabelas: this.resumir('main') }
    } finally {
      this.desanexar()
    }
  }

  // ---- Validação ----

  // Confere que o arquivo anexado é um SQLite íntegro, com o mesmo schema da base atual.
  private validar(): string[] {
    const integridade = this.conexao.prepare(`PRAGMA ${APELIDO}.integrity_check`).get()?.integrity_check
    if (integridade !== 'ok') throw new ErroImportacao(`Arquivo corrompido: ${String(integridade)}`)

    const atuais = this.tabelas('main')
    const recebidas = this.tabelas(APELIDO)
    const diferencas: string[] = []

    for (const tabela of atuais.filter((t) => !recebidas.includes(t))) diferencas.push(`falta a tabela ${tabela}`)
    for (const tabela of recebidas.filter((t) => !atuais.includes(t))) diferencas.push(`tabela desconhecida ${tabela}`)
    for (const tabela of atuais.filter((t) => recebidas.includes(t))) {
      const esperadas = this.colunas('main', tabela)
      const encontradas = this.colunas(APELIDO, tabela)
      for (const c of esperadas.filter((c) => !encontradas.includes(c))) diferencas.push(`falta a coluna ${tabela}.${c}`)
      for (const c of encontradas.filter((c) => !esperadas.includes(c))) diferencas.push(`coluna desconhecida ${tabela}.${c}`)
    }
    if (diferencas.length) {
      throw new ErroImportacao(
        'O arquivo foi exportado com outra versão do schema (db/schema.sql). ' +
          'Atualize o código nos dois computadores para a mesma versão e exporte de novo. ' +
          `Diferenças: ${diferencas.join('; ')}.`,
      )
    }

    const violacoes = this.conexao.prepare(`PRAGMA ${APELIDO}.foreign_key_check`).all()
    if (violacoes.length) {
      throw new ErroImportacao(`O arquivo tem ${violacoes.length} referência(s) quebrada(s) entre tabelas.`)
    }

    return atuais
  }

  // ---- Apoio ----

  // VACUUM INTO: cópia consistente mesmo com o banco em uso, já incluindo o conteúdo do WAL.
  private copiar(destino: string): void {
    fs.mkdirSync(path.dirname(destino), { recursive: true })
    fs.rmSync(destino, { force: true })
    this.conexao.prepare('VACUUM INTO ?').run(destino)
  }

  private fazerBackup(): string {
    const destino = path.join(this.pastaBackups, `antes-da-importacao-${BaseDados.carimbo()}.db`)
    this.copiar(destino)
    return destino
  }

  // O SQLite pode recusar um arquivo inválido já no ATTACH ou só na primeira leitura.
  private anexar(arquivo: string): void {
    const invalido = (erro: unknown) =>
      new ErroImportacao(`O arquivo não é uma base SQLite válida (${(erro as Error).message}).`)
    try {
      this.conexao.prepare(`ATTACH DATABASE ? AS ${APELIDO}`).run(arquivo)
    } catch (erro) {
      throw invalido(erro)
    }
    try {
      this.conexao.prepare(`SELECT 1 FROM ${APELIDO}.sqlite_master LIMIT 1`).all()
    } catch (erro) {
      this.desanexar()
      throw invalido(erro)
    }
  }

  private desanexar(): void {
    this.conexao.exec(`DETACH DATABASE ${APELIDO}`)
  }

  private tabelas(esquema: string): string[] {
    return this.conexao
      .prepare(`SELECT name FROM ${esquema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all()
      .map((linha) => String(linha.name))
  }

  private colunas(esquema: string, tabela: string): string[] {
    return this.conexao
      .prepare(`PRAGMA ${esquema}.table_info(${tabela})`)
      .all()
      .map((linha) => String(linha.name))
  }

  private resumir(esquema: string): TabelaResumo[] {
    return this.tabelas(esquema).map((nome) => ({
      nome,
      registros: Number(this.conexao.prepare(`SELECT COUNT(*) AS n FROM ${esquema}.${nome}`).get()?.n ?? 0),
    }))
  }

  /** "2026-09-28_2330", para nomes de arquivo. */
  static carimbo(instante = new Date()): string {
    return instante.toISOString().slice(0, 16).replace('T', '_').replace(':', '')
  }
}
