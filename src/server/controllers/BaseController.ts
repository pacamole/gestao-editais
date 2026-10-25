import express, { Router } from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { baseServico } from '../composicao.js'
import { novoId } from '../db/index.js'
import { ErroValidacao } from '../dominio/erros.js'

export const rotasBase = Router()

const temporario = () => path.join(os.tmpdir(), `gestao-editais-${novoId()}.db`)

// Baixa a base inteira como arquivo .db.
rotasBase.get('/exportar', (_req, res, next) => {
  const arquivo = temporario()
  try {
    baseServico.exportarPara(arquivo)
  } catch (erro) {
    fs.rmSync(arquivo, { force: true })
    return next(erro)
  }
  res.download(arquivo, baseServico.nomeExportacao(), () => fs.rmSync(arquivo, { force: true }))
})

// Recebe o arquivo .db no corpo da requisição (application/octet-stream) e substitui a base.
rotasBase.post('/importar', express.raw({ type: 'application/octet-stream', limit: '200mb' }), (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    throw new ErroValidacao('Envie o arquivo .db no corpo, com Content-Type application/octet-stream.')
  }

  const arquivo = temporario()
  try {
    fs.writeFileSync(arquivo, req.body)
    res.json(baseServico.importarDe(arquivo))
  } finally {
    fs.rmSync(arquivo, { force: true })
  }
})

rotasBase.get('/resumo', (_req, res) => {
  res.json(baseServico.resumo())
})

rotasBase.get('/backups', (_req, res) => {
  res.json(baseServico.listarBackups())
})

rotasBase.get('/backups/:nome', (req, res) => {
  res.download(baseServico.caminhoBackup(req.params.nome), req.params.nome)
})

rotasBase.post('/backups/:nome/restaurar', (req, res) => {
  res.json(baseServico.restaurar(req.params.nome))
})

// ---- Base na nuvem (Turso) ----
rotasBase.post('/nuvem/testar', (req, res) => {
  res.json(baseServico.testarNuvem(req.body))
})

rotasBase.post('/nuvem/conectar', (req, res) => {
  res.json(baseServico.conectarNuvem(req.body))
})

rotasBase.post('/nuvem/reconectar', (_req, res) => {
  res.json(baseServico.reconectarNuvem())
})

rotasBase.post('/local', (_req, res) => {
  res.json(baseServico.usarLocal())
})
