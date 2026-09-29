import express, { Router } from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ErroApi } from '../../shared/api.js'
import { novoId } from '../db/index.js'
import { baseDados, ErroImportacao, nomeExportacao } from '../base/index.js'

// TODO: restringir ao papel GESTOR quando a autenticação existir.
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
