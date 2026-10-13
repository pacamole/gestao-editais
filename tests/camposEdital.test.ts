import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCamposManuais } from '../src/server/validacaoCamposEdital.js'

test('valida e normaliza edições manuais dos dados extraídos', () => {
  assert.deepEqual(
    validarCamposManuais({
      orgao_financiador: ' Fundação Aurora ',
      modalidade: 'SUBVENCAO',
      prazo_inscricao: '2026-11-30',
      valor_maximo_por_projeto: 150000,
      exige_contrapartida: false,
      publico_alvo: [' Microempresas ', '', 'Startups'],
      resumo_executivo: '  Apoio à inovação  ',
    }),
    {
      orgao_financiador: 'Fundação Aurora',
      modalidade: 'SUBVENCAO',
      prazo_inscricao: '2026-11-30',
      valor_maximo_por_projeto: 150000,
      exige_contrapartida: false,
      publico_alvo: ['Microempresas', 'Startups'],
      resumo_executivo: 'Apoio à inovação',
    },
  )
})

test('permite limpar campos e recusa chaves não editáveis', () => {
  assert.deepEqual(validarCamposManuais({ prazo_inscricao: null }), { prazo_inscricao: null })
  assert.throws(
    () => validarCamposManuais({ status: 'APROVADO' }),
    /não pode ser editado/,
  )
})

test('recusa datas impossíveis, números inválidos e modalidades desconhecidas', () => {
  assert.throws(() => validarCamposManuais({ data_publicacao: '2026-02-31' }), /data válida/)
  assert.throws(() => validarCamposManuais({ percentual_contrapartida: 101 }), /número válido/)
  assert.throws(() => validarCamposManuais({ valor_total_disponivel: -1 }), /número válido/)
  assert.throws(() => validarCamposManuais({ modalidade: 'INVENTADA' }), /Modalidade inválida/)
})

test('exige pelo menos um campo e trata false como um valor definido', () => {
  assert.throws(() => validarCamposManuais({}), /ao menos um campo/)
  assert.deepEqual(validarCamposManuais({ exige_contrapartida: false }), { exige_contrapartida: false })
})
