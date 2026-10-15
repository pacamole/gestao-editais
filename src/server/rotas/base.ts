import express, { Router } from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type {
  ConectarNuvemEntrada,
  ConexaoBase,
  ErroApi,
  ListaBackupsResposta,
  ResumoBaseResposta,
  TesteNuvemEntrada,
  TesteNuvemResposta,
  TrocaBaseResposta,
} from '../../shared/api.js'
import { abrirLocal, abrirRemota, lerConfigConexao } from '../db/conexao.js'
import { db, estadoBase, novoId, trocarBase } from '../db/index.js'
import { baseDados, ErroImportacao, nomeExportacao } from '../base/index.js'

export const rotasBase = Router()

const temporario = () => path.join(os.tmpdir(), `gestao-editais-${novoId()}.db`)

// Baixa a base inteira como arquivo .db.
rotasBase.get('/exportar', (_req, res, next) => {
  const arquivo = temporario()
  try {
    baseDados.exportar(arquivo)
  } catch (erro) {
    fs.rmSync(arquivo, { force: true })
    return next(erro)
  }
  res.download(arquivo, nomeExportacao(), () => fs.rmSync(arquivo, { force: true }))
})

// Recebe o arquivo .db no corpo da requisição (application/octet-stream) e substitui a base.
rotasBase.post('/importar', express.raw({ type: 'application/octet-stream', limit: '200mb' }), (req, res, next) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    const corpo: ErroApi = { erro: 'Envie o arquivo .db no corpo, com Content-Type application/octet-stream.' }
    return res.status(400).json(corpo)
  }

  const arquivo = temporario()
  try {
    fs.writeFileSync(arquivo, req.body)
    res.json(baseDados.importar(arquivo))
  } catch (erro) {
    if (erro instanceof ErroImportacao) {
      const corpo: ErroApi = { erro: erro.message }
      return res.status(400).json(corpo)
    }
    next(erro)
  } finally {
    fs.rmSync(arquivo, { force: true })
  }
})

function conexaoAtual(): ConexaoBase {
  return estadoBase()
}

rotasBase.get('/resumo', (_req, res) => {
  res.json({ ...baseDados.resumo(), conexao: conexaoAtual() } satisfies ResumoBaseResposta)
})

rotasBase.get('/backups', (_req, res) => {
  res.json({ backups: baseDados.listarBackups() } satisfies ListaBackupsResposta)
})

rotasBase.get('/backups/:nome', (req, res) => {
  const caminho = baseDados.caminhoBackup(req.params.nome)
  if (!caminho) return res.status(404).json({ erro: 'Backup não encontrado.' } satisfies ErroApi)
  res.download(caminho, req.params.nome)
})

// Volta a base para um backup; o estado atual vira um novo backup antes.
rotasBase.post('/backups/:nome/restaurar', (req, res, next) => {
  try {
    res.json(baseDados.restaurar(req.params.nome))
  } catch (erro) {
    if (erro instanceof ErroImportacao) return res.status(400).json({ erro: erro.message } satisfies ErroApi)
    next(erro)
  }
})

// ---- Base na nuvem (Turso) ----

// libsql:// é o formato do Turso; http(s):// serve para um servidor libSQL próprio.
const URL_NUVEM = /^(libsql|https?):\/\/[^\s/]+/

function lerNuvem(corpo: unknown): TesteNuvemEntrada | null {
  const { url, token } = (corpo ?? {}) as Record<string, unknown>
  const dados = { url: String(url ?? '').trim(), token: String(token ?? '').trim() }
  return URL_NUVEM.test(dados.url) && dados.token ? dados : null
}

const ERRO_ENTRADA_NUVEM: ErroApi = { erro: 'Informe a URL do banco (libsql://… ou https://…) e o token.' }

// Abre a base na nuvem, analisa e fecha. Erros de rede e de token viram situações, não exceções.
function testarNuvem({ url, token }: TesteNuvemEntrada): TesteNuvemResposta {
  let remota
  try {
    remota = abrirRemota(url, token)
    const analise = baseDados.analisarNuvem(remota)
    return analise.situacao === 'COM_DADOS'
      ? { situacao: 'COM_DADOS', tabelas: analise.tabelas }
      : analise.situacao === 'SCHEMA_DIFERENTE'
        ? { situacao: 'SCHEMA_DIFERENTE', diferencas: analise.diferencas }
        : { situacao: 'VAZIA' }
  } catch (erro) {
    const mensagem = (erro as Error).message ?? String(erro)
    if (/401|403|unauthori[sz]ed|forbidden|auth/i.test(mensagem)) return { situacao: 'TOKEN_RECUSADO' }
    return { situacao: 'SEM_CONEXAO', mensagem }
  } finally {
    remota?.close()
  }
}

rotasBase.post('/nuvem/testar', (req, res) => {
  const nuvem = lerNuvem(req.body)
  if (!nuvem) return res.status(400).json(ERRO_ENTRADA_NUVEM)
  res.json(testarNuvem(nuvem))
})

// Passa a usar a base na nuvem. Se ela estiver vazia, cria a estrutura e (opcional) envia os dados locais.
// A base deste computador não é alterada: dá para voltar a ela depois.
rotasBase.post('/nuvem/conectar', (req, res, next) => {
  const nuvem = lerNuvem(req.body)
  if (!nuvem) return res.status(400).json(ERRO_ENTRADA_NUVEM)
  const { enviarDadosLocais } = req.body as ConectarNuvemEntrada

  const teste = testarNuvem(nuvem)
  if (teste.situacao === 'TOKEN_RECUSADO') return res.status(400).json({ erro: 'O Turso recusou o token.' } satisfies ErroApi)
  if (teste.situacao === 'SEM_CONEXAO') return res.status(502).json({ erro: `Sem conexão com a base na nuvem: ${teste.mensagem}` } satisfies ErroApi)
  if (teste.situacao === 'SCHEMA_DIFERENTE') {
    return res.status(400).json({ erro: 'A base na nuvem foi criada por outra versão do sistema.' } satisfies ErroApi)
  }

  try {
    if (teste.situacao === 'VAZIA') {
      const remota = abrirRemota(nuvem.url, nuvem.token)
      // Dados locais: a base em uso, se for a local; senão, o arquivo local guardado.
      const local = enviarDadosLocais ? (estadoBase().modo === 'LOCAL' ? db : abrirLocal()) : null
      try {
        baseDados.prepararNuvem(remota, local)
      } finally {
        remota.close()
        if (local && local !== db) (local as { close(): void }).close()
      }
    }
    trocarBase({ modo: 'NUVEM', url: nuvem.url, token: nuvem.token })
    res.json({ ok: true, conexao: conexaoAtual() } satisfies TrocaBaseResposta)
  } catch (erro) {
    next(erro)
  }
})

// Tenta de novo a base na nuvem salva (quando ela não abriu e o sistema seguiu com a local).
rotasBase.post('/nuvem/reconectar', (_req, res) => {
  const config = lerConfigConexao()
  if (config.modo !== 'NUVEM') return res.status(400).json({ erro: 'Nenhuma base na nuvem configurada.' } satisfies ErroApi)
  try {
    trocarBase(config)
    res.json({ ok: true, conexao: conexaoAtual() } satisfies TrocaBaseResposta)
  } catch (erro) {
    console.error('Reconectar à base na nuvem falhou:', erro)
    res.status(502).json({ erro: 'Ainda sem conexão com a base na nuvem. Confira a internet e tente de novo.' } satisfies ErroApi)
  }
})

// Volta a usar a base deste computador. A base na nuvem continua lá, intacta.
rotasBase.post('/local', (_req, res, next) => {
  try {
    trocarBase({ modo: 'LOCAL', url: '', token: '' })
    res.json({ ok: true, conexao: conexaoAtual() } satisfies TrocaBaseResposta)
  } catch (erro) {
    next(erro)
  }
})
