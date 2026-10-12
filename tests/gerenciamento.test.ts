import test from 'node:test'
import assert from 'node:assert/strict'
import { repositorios } from '../src/server/repositorios/index.js'

test('Perfil da empresa deve existir com dados mínimos após o bootstrap', () => {
  const perfil = repositorios.perfilEmpresa.obter()
  assert.ok(perfil, 'Perfil da empresa deve existir no banco')
  assert.equal(perfil?.id, 1)
  assert.ok(perfil?.razao_social.length > 0)
})

test('Critérios padrão devem ser criados para o gestor editar', () => {
  const criterios = repositorios.criterio.listar()
  const eliminatorios = repositorios.criterio.listarPorTipo('ELIMINATORIO')
  const pontuaveis = repositorios.criterio.listarPorTipo('PONTUAVEL')

  assert.equal(eliminatorios.length, 11)
  assert.equal(pontuaveis.length, 6)
  assert.equal(criterios.length, 17)
})
