import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { BackupBase, ResultadoExportacao, ResultadoImportacao, ResumoBase, TabelaResumo } from '../../shared/api.js'
import type { Conexao, ValorSql } from '../db/conexao.js'

// Erro de arquivo recebido (inválido, corrompido ou de outro schema). A base atual não é alterada.
export class ErroImportacao extends Error {}

// Tabelas que não viajam entre computadores: sessões de login valem só onde foram criadas.
const TABELAS_LOCAIS = ['sessao']

// Só nomes simples de arquivo .db: impede pedir um arquivo fora da pasta de backups.
const NOME_BACKUP = /^[\w.-]+\.db$/

// Parâmetros por INSERT em lote (abaixo do limite do SQLite e leve para a nuvem).
const PARAMETROS_POR_LOTE = 500

// Situação de uma base na nuvem antes de conectar.
export type AnaliseNuvem =
  | { situacao: 'VAZIA' }
  | { situacao: 'COM_DADOS'; tabelas: TabelaResumo[] }
  | { situacao: 'SCHEMA_DIFERENTE'; diferencas: string[] }

/**
 * Exporta, importa e faz backup da base, com a base local (node:sqlite) ou na nuvem (libsql).
 *
 * Não usa ATTACH: na base da nuvem as escritas vão para o servidor, que não enxerga arquivos
 * deste computador. Por isso o arquivo recebido é aberto numa conexão própria e as linhas são
 * copiadas em lotes, dentro de uma transação, depois de tudo validado.
 */
export class BaseDados {
  constructor(
    // Função, e não a conexão: a base em uso pode ser trocada com o servidor rodando.
    private readonly conexao: () => Conexao,
    private readonly pastaBackups: string,
    private readonly arquivoSchema: string,
  ) {}

  /** Grava uma cópia da base em `destino`, sem as tabelas locais. */
  exportar(destino: string): ResultadoExportacao {
    this.copiarPara(destino)
    const copia = new DatabaseSync(destino)
    try {
      for (const tabela of TABELAS_LOCAIS) copia.exec(`DELETE FROM ${tabela}`)
      return { arquivo: destino, tamanhoBytes: fs.statSync(destino).size, tabelas: resumir(copia) }
    } finally {
      copia.close()
    }
  }

  /**
   * Substitui todos os dados da base em uso pelos do arquivo. Antes, grava um backup da
   * base atual em `pastaBackups`. Sessões de login são apagadas (todos entram de novo).
   */
  importar(arquivo: string, motivoBackup = 'antes-da-importacao'): ResultadoImportacao {
    if (!fs.existsSync(arquivo)) throw new ErroImportacao(`Arquivo não encontrado: ${arquivo}`)
    const fonte = abrirArquivoRecebido(arquivo)
    try {
      const destino = this.conexao()
      const nomes = validarContra(fonte, destino)
      const backup = this.fazerBackup(motivoBackup)
      substituirDados(fonte, destino, nomes)
      return { backup, tabelas: resumir(destino) }
    } finally {
      fonte.close()
    }
  }

  /** Arquivo, tamanho e contagem de registros da base em uso. */
  resumo(): ResumoBase {
    const conexao = this.conexao()
    const arquivo = String(conexao.prepare('PRAGMA main.database_list').all()[0]?.file ?? '')
    let tamanhoBytes = 0
    try {
      tamanhoBytes = arquivo ? fs.statSync(arquivo).size : 0
    } catch {
      // Arquivo inacessível: segue sem o tamanho.
    }
    return { arquivo, tamanhoBytes, tabelas: resumir(conexao) }
  }

  /** Backups automáticos, do mais recente para o mais antigo. */
  listarBackups(): BackupBase[] {
    if (!fs.existsSync(this.pastaBackups)) return []
    return fs
      .readdirSync(this.pastaBackups)
      .filter((nome) => NOME_BACKUP.test(nome))
      .map((nome) => {
        const info = fs.statSync(path.join(this.pastaBackups, nome))
        return { nome, tamanhoBytes: info.size, criadoEm: info.mtime.toISOString() }
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  }

  /** Caminho de um backup existente; null se o nome for inválido ou não existir. */
  caminhoBackup(nome: string): string | null {
    if (!NOME_BACKUP.test(nome)) return null
    const caminho = path.join(this.pastaBackups, nome)
    return fs.existsSync(caminho) ? caminho : null
  }

  /** Volta a base para um backup. É uma importação: valida e grava um backup do estado atual antes. */
  restaurar(nome: string): ResultadoImportacao {
    const caminho = this.caminhoBackup(nome)
    if (!caminho) throw new ErroImportacao(`Backup não encontrado: ${nome}`)
    return this.importar(caminho, 'antes-da-restauracao')
  }

  // ---- Base na nuvem ----

  /** Compara uma base na nuvem com o schema desta versão do sistema. */
  analisarNuvem(remota: Conexao): AnaliseNuvem {
    if (!tabelas(remota).length) return { situacao: 'VAZIA' }
    const referencia = this.schemaDeReferencia()
    try {
      const diferencas = diferencasDeSchema(referencia, remota)
      if (diferencas.length) return { situacao: 'SCHEMA_DIFERENTE', diferencas }
      return { situacao: 'COM_DADOS', tabelas: resumir(remota) }
    } finally {
      referencia.close()
    }
  }

  /** Cria a estrutura numa base vazia da nuvem e, se pedido, envia os dados de `dadosLocais`. */
  prepararNuvem(remota: Conexao, dadosLocais: Conexao | null): void {
    remota.exec(fs.readFileSync(this.arquivoSchema, 'utf8'))
    if (dadosLocais) substituirDados(dadosLocais, remota, tabelas(remota))
  }

  // ---- Apoio ----

  // Base vazia em memória com o db/schema.sql desta versão, para comparar.
  private schemaDeReferencia(): DatabaseSync {
    const referencia = new DatabaseSync(':memory:')
    referencia.exec(fs.readFileSync(this.arquivoSchema, 'utf8'))
    return referencia
  }

  // Base local: VACUUM INTO (rápido e consistente). Nuvem: copia schema e linhas da réplica.
  private copiarPara(destino: string): void {
    fs.mkdirSync(path.dirname(destino), { recursive: true })
    fs.rmSync(destino, { force: true })
    const origem = this.conexao()
    if (origem instanceof DatabaseSync) {
      origem.prepare('VACUUM INTO ?').run(destino)
      return
    }
    const copia = new DatabaseSync(destino)
    try {
      const objetos = origem
        .prepare("SELECT type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'")
        .all()
      // Tabelas antes de índices, gatilhos e visões.
      for (const tipo of ['table', 'index', 'trigger', 'view']) {
        for (const objeto of objetos.filter((o) => o.type === tipo)) copia.exec(String(objeto.sql))
      }
      substituirDados(origem, copia, tabelas(copia))
    } finally {
      copia.close()
    }
  }

  private fazerBackup(motivo: string): string {
    // Com segundos: duas importações no mesmo minuto não sobrescrevem o backup uma da outra.
    const agora = new Date()
    const destino = path.join(this.pastaBackups, `${motivo}-${BaseDados.carimbo(agora)}${agora.toISOString().slice(17, 19)}.db`)
    this.copiarPara(destino)
    return destino
  }

  /** "2026-09-28_2330", para nomes de arquivo. */
  static carimbo(instante = new Date()): string {
    return instante.toISOString().slice(0, 16).replace('T', '_').replace(':', '')
  }
}

// ---- Funções sobre qualquer conexão (local, réplica ou remota) ----

function abrirArquivoRecebido(arquivo: string): DatabaseSync {
  let fonte: DatabaseSync | undefined
  try {
    fonte = new DatabaseSync(arquivo, { readOnly: true })
    fonte.prepare('SELECT 1 FROM sqlite_master LIMIT 1').all()
    return fonte
  } catch (erro) {
    fonte?.close()
    throw new ErroImportacao(`O arquivo não é uma base SQLite válida (${(erro as Error).message}).`)
  }
}

function tabelas(conexao: Conexao): string[] {
  return conexao
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' ORDER BY name")
    .all()
    .map((linha) => String(linha.name))
}

function colunas(conexao: Conexao, tabela: string): string[] {
  return conexao
    .prepare(`PRAGMA table_info(${tabela})`)
    .all()
    .map((linha) => String(linha.name))
}

function resumir(conexao: Conexao): TabelaResumo[] {
  return tabelas(conexao).map((nome) => ({
    nome,
    registros: Number(conexao.prepare(`SELECT COUNT(*) AS n FROM ${nome}`).get()?.n ?? 0),
  }))
}

function diferencasDeSchema(esperado: Conexao, encontrado: Conexao): string[] {
  const atuais = tabelas(esperado)
  const recebidas = tabelas(encontrado)
  const diferencas: string[] = []
  for (const tabela of atuais.filter((t) => !recebidas.includes(t))) diferencas.push(`falta a tabela ${tabela}`)
  for (const tabela of recebidas.filter((t) => !atuais.includes(t))) diferencas.push(`tabela desconhecida ${tabela}`)
  for (const tabela of atuais.filter((t) => recebidas.includes(t))) {
    const esperadas = colunas(esperado, tabela)
    const encontradas = colunas(encontrado, tabela)
    for (const c of esperadas.filter((c) => !encontradas.includes(c))) diferencas.push(`falta a coluna ${tabela}.${c}`)
    for (const c of encontradas.filter((c) => !esperadas.includes(c))) diferencas.push(`coluna desconhecida ${tabela}.${c}`)
  }
  return diferencas
}

// Confere que o arquivo recebido é íntegro e tem o mesmo schema da base em uso.
function validarContra(fonte: DatabaseSync, destino: Conexao): string[] {
  const integridade = fonte.prepare('PRAGMA integrity_check').get()?.integrity_check
  if (integridade !== 'ok') throw new ErroImportacao(`Arquivo corrompido: ${String(integridade)}`)

  const diferencas = diferencasDeSchema(destino, fonte)
  if (diferencas.length) {
    throw new ErroImportacao(
      'O arquivo foi exportado com outra versão do schema (db/schema.sql). ' +
        'Atualize o código nos dois computadores para a mesma versão e exporte de novo. ' +
        `Diferenças: ${diferencas.join('; ')}.`,
    )
  }

  const violacoes = fonte.prepare('PRAGMA foreign_key_check').all()
  if (violacoes.length) {
    throw new ErroImportacao(`O arquivo tem ${violacoes.length} referência(s) quebrada(s) entre tabelas.`)
  }
  return tabelas(destino)
}

/**
 * Troca todos os dados de `destino` pelos de `origem`, numa transação.
 * Apaga tudo antes de inserir: apagar e inserir tabela por tabela faria o ON DELETE CASCADE de
 * uma tabela "pai" levar junto linhas recém-copiadas das "filhas". Referências são conferidas
 * só no COMMIT (defer_foreign_keys), porque a ordem das tabelas não segue as dependências.
 */
function substituirDados(origem: Conexao, destino: Conexao, nomes: string[]): void {
  destino.exec('BEGIN')
  try {
    destino.exec('PRAGMA defer_foreign_keys = ON')
    for (const tabela of nomes) destino.exec(`DELETE FROM ${tabela}`)
    for (const tabela of nomes) {
      if (!TABELAS_LOCAIS.includes(tabela)) copiarLinhas(origem, destino, tabela)
    }
    destino.exec('COMMIT')
  } catch (erro) {
    destino.exec('ROLLBACK')
    throw erro
  }
}

function copiarLinhas(origem: Conexao, destino: Conexao, tabela: string): void {
  const nomes = colunas(destino, tabela)
  const lista = nomes.join(', ')
  const linhas = origem.prepare(`SELECT ${lista} FROM ${tabela}`).all()
  const porLote = Math.max(1, Math.floor(PARAMETROS_POR_LOTE / nomes.length))
  const marcadores = `(${nomes.map(() => '?').join(', ')})`
  for (let i = 0; i < linhas.length; i += porLote) {
    const lote = linhas.slice(i, i + porLote)
    const valores = lote.flatMap((linha) => nomes.map((c) => (linha[c] ?? null) as ValorSql))
    destino.prepare(`INSERT INTO ${tabela} (${lista}) VALUES ${lote.map(() => marcadores).join(', ')}`).run(...valores)
  }
}
