import { Router } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { db, novoId, transacao } from '../db/index.js'
import { ColetaServico } from '../coleta/servico.js'
import { repositorios } from '../repositorios/index.js'
import type { Edital, StatusEdital, StatusElegibilidade, Modalidade, Classificacao } from '../entidades.js'
import { ErroOllama, extrairCamposDoEdital, transmitirRespostaSobreEdital, type CampoEditalExtraido, type ResultadoExtracaoEdital, type ValorCampoEditalExtraido } from '../chat/ollama.js'
import { ehMarcadorDeTextoPdf, extrairPdf } from '../coleta/pdf.js'
import { lerPaginaPublica } from '../coleta/pagina.js'
import { MARCADOR_EDICAO_MANUAL, validarCamposManuais, type CampoEditavel } from '../validacaoCamposEdital.js'
import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { ELEGIBILIDADE, MODALIDADES, STATUS_EDITAL } from '../../shared/rotulos.js'

const CRITERIOS_PADRAO = [
  { nome: 'Prazo ainda aberto', tipo: 'ELIMINATORIO', campo_edital: 'prazo_inscricao', campo_perfil: null, operador: 'MAIOR_QUE', valor_referencia: 'hoje', mensagem_reprovacao: 'O prazo de inscrição já expirou.', ativo: true, ordem: 0 },
  { nome: 'Prazo suficiente para preparo', tipo: 'ELIMINATORIO', campo_edital: 'prazo_inscricao', campo_perfil: 'prazo_minimo_preparo_dias', operador: 'MAIOR_QUE', valor_referencia: null, mensagem_reprovacao: 'O edital não oferece prazo suficiente para preparar a proposta.', ativo: true, ordem: 1 },
  { nome: 'CNAE aceito', tipo: 'ELIMINATORIO', campo_edital: 'cnaes_aceitos', campo_perfil: 'cnae_principal', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O CNAE principal da empresa não está habilitado pelo edital.', ativo: true, ordem: 2 },
  { nome: 'Porte aceito', tipo: 'ELIMINATORIO', campo_edital: 'portes_aceitos', campo_perfil: 'porte', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O porte da empresa não atende à regra do edital.', ativo: true, ordem: 3 },
  { nome: 'Natureza jurídica aceita', tipo: 'ELIMINATORIO', campo_edital: 'natureza_juridica_aceita', campo_perfil: 'natureza_juridica', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'A natureza jurídica da empresa não é aceita no edital.', ativo: true, ordem: 4 },
  { nome: 'Região elegível', tipo: 'ELIMINATORIO', campo_edital: 'abrangencia_geografica', campo_perfil: 'uf', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O estado da empresa não está coberto pela abrangência do edital.', ativo: true, ordem: 5 },
  { nome: 'Tempo de fundação', tipo: 'ELIMINATORIO', campo_edital: 'tempo_minimo_fundacao_meses', campo_perfil: 'data_fundacao', operador: 'MENOR_QUE', valor_referencia: null, mensagem_reprovacao: 'A empresa não atende ao tempo mínimo de fundação.', ativo: true, ordem: 6 },
  { nome: 'Faturamento dentro da faixa', tipo: 'ELIMINATORIO', campo_edital: 'faturamento_minimo', campo_perfil: 'faturamento_anual', operador: 'ENTRE', valor_referencia: 'faturamento_maximo', mensagem_reprovacao: 'O faturamento anual da empresa está fora da faixa aceitável pelo edital.', ativo: true, ordem: 7 },
  { nome: 'Parceria com ICT', tipo: 'ELIMINATORIO', campo_edital: 'exige_ict_parceira', campo_perfil: 'possui_ict_parceira', operador: 'FALSO', valor_referencia: null, mensagem_reprovacao: 'O edital exige parceria com ICT e a empresa não atende a essa condição.', ativo: true, ordem: 8 },
  { nome: 'Certidões disponíveis', tipo: 'ELIMINATORIO', campo_edital: 'certidoes_exigidas', campo_perfil: 'certidoes_disponiveis', operador: 'CONTIDO_EM', valor_referencia: null, mensagem_reprovacao: 'A empresa não possui as certidões exigidas pelo edital.', ativo: true, ordem: 9 },
  { nome: 'Contrapartida suportável', tipo: 'ELIMINATORIO', campo_edital: 'percentual_contrapartida', campo_perfil: 'capacidade_contrapartida_percentual', operador: 'MENOR_QUE', valor_referencia: null, mensagem_reprovacao: 'A empresa não suporta o percentual mínimo de contrapartida exigido.', ativo: true, ordem: 10 },
  { nome: 'Aderência temática', tipo: 'PONTUAVEL', campo_edital: 'areas_tematicas', campo_perfil: 'areas_atuacao', operador: 'INTERSECCAO', valor_referencia: null, peso: 10, mensagem_reprovacao: null, ativo: true, ordem: 0 },
  { nome: 'Valor da oportunidade', tipo: 'PONTUAVEL', campo_edital: 'valor_maximo_por_projeto', campo_perfil: 'valor_minimo_interesse', operador: 'MAIOR_QUE', valor_referencia: null, peso: 8, mensagem_reprovacao: null, ativo: true, ordem: 1 },
  { nome: 'Folga de prazo', tipo: 'PONTUAVEL', campo_edital: 'prazo_inscricao', campo_perfil: 'prazo_minimo_preparo_dias', operador: 'MAIOR_QUE', valor_referencia: null, peso: 6, mensagem_reprovacao: null, ativo: true, ordem: 2 },
  { nome: 'Modalidade preferida', tipo: 'PONTUAVEL', campo_edital: 'modalidade', campo_perfil: null, operador: 'IGUAL', valor_referencia: 'SUBVENCAO', peso: 5, mensagem_reprovacao: null, ativo: true, ordem: 3 },
  { nome: 'Ausência de contrapartida', tipo: 'PONTUAVEL', campo_edital: 'exige_contrapartida', campo_perfil: null, operador: 'FALSO', valor_referencia: null, peso: 4, mensagem_reprovacao: null, ativo: true, ordem: 4 },
  { nome: 'Densidade de palavras-chave', tipo: 'PONTUAVEL', campo_edital: 'texto_extraido', campo_perfil: 'palavras_chave', operador: 'CONTEM', valor_referencia: null, peso: 3, mensagem_reprovacao: null, ativo: true, ordem: 5 },
] as const

function normalizarLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((v) => v != null).map((v) => String(v).trim()).filter(Boolean)
  if (typeof valor === 'string') return valor.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

function salvarCamposExtraidos(edital: Edital, extracao: ResultadoExtracaoEdital): CampoEditalExtraido[] {
  const alteracoes: Partial<Edital> = {}
  const camposAtualizados: CampoEditalExtraido[] = []
  for (const [campo, valor] of Object.entries(extracao.campos) as [CampoEditalExtraido, ValorCampoEditalExtraido][]) {
    const valorAtual = edital[campo]
    if (valor == null || (valorAtual != null && valorAtual !== '')) continue
    Object.assign(alteracoes, { [campo]: valor })
    camposAtualizados.push(campo)
  }

  if (camposAtualizados.length) {
    transacao(() => {
      repositorios.edital.atualizar(edital.id, alteracoes)
      for (const campo of camposAtualizados) {
        const evidencia = extracao.evidencias[campo]
        if (!evidencia) continue
        repositorios.evidencia.excluirDoCampo(edital.id, campo)
        repositorios.evidencia.inserir({
          id: novoId(),
          edital_id: edital.id,
          campo,
          trecho_literal: evidencia.trecho,
          pagina: evidencia.pagina,
          confianca: 'MEDIA',
        })
      }
    })
  }
  return camposAtualizados
}

function semConteudoWebAnterior(texto: string): string {
  return texto
    .replace(/(?:^|\n\n)\[Fonte URL:[^\]]+\]\n[\s\S]*?(?=\n\n\[(?:Página\s+\d+|Fonte URL:)[^\]]*\]|$)/g, '')
    .trim()
}

function obterCampo(obj: Record<string, any> | null | undefined, campo: string | null | undefined) {
  if (!campo || !obj) return undefined
  if (campo === 'hoje') return new Date().toISOString().slice(0, 10)
  return obj[campo]
}

function valorTexto(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor.trim()
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return JSON.stringify(valor)
}

function garantirBootstraps() {
  if (!repositorios.perfilEmpresa.obter()) {
    repositorios.perfilEmpresa.inserir({
      id: 1,
      razao_social: 'I9+ Consultoria e Inovação',
      nome_fantasia: 'I9+',
      cnpj: '00.000.000/0000-00',
      cnae_principal: '5821-1/00',
      cnaes_secundarios: ['6201-5/00', '7210-0/00'],
      porte: 'ME',
      natureza_juridica: 'Sociedade Empresária Limitada',
      data_fundacao: '2020-01-01',
      faturamento_anual: 4200000,
      uf: 'PR',
      municipio: 'Curitiba',
      areas_atuacao: ['ESG', 'Sustentabilidade', 'Inovação', 'Energia', 'Descarbonização'],
      palavras_chave: ['ESG', 'sustentabilidade', 'inovação', 'energia', 'descarbonização', 'clima'],
      possui_ict_parceira: false,
      certidoes_disponiveis: ['CND', 'FGTS', 'CRLV'],
      capacidade_contrapartida_percentual: 30,
      valor_minimo_interesse: 500000,
      prazo_minimo_preparo_dias: 30,
      atualizado_em: new Date().toISOString(),
    })
  }

  if (repositorios.criterio.contar() === 0) {
    for (const item of CRITERIOS_PADRAO) {
      repositorios.criterio.inserir({
        ...item,
        valor_referencia: item.valor_referencia ?? null,
        campo_perfil: item.campo_perfil ?? null,
        mensagem_reprovacao: item.mensagem_reprovacao ?? null,
        peso: 'peso' in item ? item.peso ?? null : null,
      })
    }
  }

  for (const tipo of TIPOS_NOTIFICACAO) {
    const jaExiste = repositorios.configAlerta.listar().some((config) => config.tipo === tipo)
    if (!jaExiste) {
      repositorios.configAlerta.inserir({ tipo, ativo: true, destinatarios: [], parametros: PARAMETROS_PADRAO[tipo] })
    }
  }

  if (!repositorios.config.obter('chat_limite_diario')) {
    repositorios.config.definir('chat_limite_diario', '20')
  }
}

function executarOperador(criterio: any, edital: any, perfil: any): boolean {
  const valorEd = obterCampo(edital, criterio.campo_edital)
  const valorPerfil = criterio.campo_perfil ? obterCampo(perfil, criterio.campo_perfil) : criterio.valor_referencia

  if (criterio.operador === 'VERDADEIRO') return Boolean(valorPerfil) && Boolean(valorEd)
  if (criterio.operador === 'FALSO') return !Boolean(valorPerfil) && !Boolean(valorEd)
  if (criterio.operador === 'IGUAL') return valorTexto(valorPerfil) === valorTexto(valorEd)
  if (criterio.operador === 'DIFERENTE') return valorTexto(valorPerfil) !== valorTexto(valorEd)
  if (criterio.operador === 'MAIOR_QUE') {
    const a = Number(valorPerfil)
    const b = Number(valorEd)
    if (Number.isFinite(a) && Number.isFinite(b)) return a > b
    if (valorPerfil != null && valorEd != null) return String(valorPerfil) > String(valorEd)
    return Boolean(valorEd)
  }
  if (criterio.operador === 'MENOR_QUE') {
    const a = Number(valorPerfil)
    const b = Number(valorEd)
    if (Number.isFinite(a) && Number.isFinite(b)) return a < b
    return String(valorPerfil ?? '').length < String(valorEd ?? '').length
  }
  if (criterio.operador === 'ENTRE') {
    const min = Number(valorEd)
    const max = Number(criterio.valor_referencia ?? obterCampo(edital, 'faturamento_maximo'))
    const atual = Number(valorPerfil)
    return Number.isFinite(atual) && Number.isFinite(min) && Number.isFinite(max) ? atual >= min && atual <= max : true
  }
  const listaEd = normalizarLista(valorEd)
  const listaPerfil = normalizarLista(valorPerfil)
  if (criterio.operador === 'LISTA_VAZIA_OU_CONTEM') {
    if (!listaEd.length) return true
    return listaPerfil.some((item) => listaEd.includes(item))
  }
  if (criterio.operador === 'CONTEM') return listaPerfil.some((item) => String(valorEd ?? '').toLowerCase().includes(item.toLowerCase()))
  if (criterio.operador === 'NAO_CONTEM') return !listaPerfil.some((item) => String(valorEd ?? '').toLowerCase().includes(item.toLowerCase()))
  if (criterio.operador === 'INTERSECCAO') return listaPerfil.some((item) => listaEd.includes(item))
  if (criterio.operador === 'CONTIDO_EM') return listaPerfil.every((item) => listaEd.includes(item))
  if (criterio.operador === 'FALSO') return !Boolean(valorEd) || !Boolean(valorPerfil)
  return true
}

function pontoCriterio(criterio: any, edital: any, perfil: any): number | null {
  const valorEd = obterCampo(edital, criterio.campo_edital)
  const valorPerfil = criterio.campo_perfil ? obterCampo(perfil, criterio.campo_perfil) : criterio.valor_referencia

  if (criterio.nome === 'Aderência temática') {
    const temaEd = normalizarLista(valorEd)
    const temaPerfil = normalizarLista(valorPerfil)
    if (!temaEd.length || !temaPerfil.length) return null
    return Math.min(1, temaPerfil.filter((item) => temaEd.some((ed) => ed.toLowerCase() === item.toLowerCase())).length / Math.max(temaPerfil.length, 1))
  }

  if (criterio.nome === 'Valor da oportunidade') {
    const valorOportunidade = Number(valorEd)
    const valorMinimo = Number(valorPerfil)
    if (!Number.isFinite(valorOportunidade) || !Number.isFinite(valorMinimo)) return null
    return valorOportunidade >= valorMinimo ? 1 : 0
  }

  if (criterio.nome === 'Folga de prazo') {
    if (!valorEd) return null
    const hoje = new Date()
    const prazo = new Date(String(valorEd))
    const dias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (!Number.isFinite(dias)) return null
    return dias > 30 ? 1 : dias > 7 ? 0.6 : dias > 0 ? 0.3 : 0
  }

  if (criterio.nome === 'Modalidade preferida') {
    return String(valorEd) === String(criterio.valor_referencia) ? 1 : 0
  }

  if (criterio.nome === 'Ausência de contrapartida') {
    return Boolean(valorEd) ? 0 : 1
  }

  if (criterio.nome === 'Densidade de palavras-chave') {
    const texto = String(valorEd ?? '').toLowerCase()
    const palavras = normalizarLista(valorPerfil).map((item) => item.toLowerCase())
    if (!texto || !palavras.length) return null
    const ocorrencias = palavras.filter((palavra) => texto.includes(palavra)).length
    return ocorrencias > 0 ? Math.min(1, ocorrencias / palavras.length) : 0
  }

  return null
}

function simularConfiguracao(editalId: string) {
  const edital = repositorios.edital.buscarPorId(editalId)
  if (!edital) throw new Error('Edital não encontrado.')
  const perfil = repositorios.perfilEmpresa.obter()
  const criterios = repositorios.criterio.listar().filter((criteria) => criteria.ativo)

  const falhas: { criterio_id: string; nome: string; mensagem: string }[] = []
  let nota = 0
  let pesoTotal = 0

  for (const criterio of criterios) {
    if (criterio.tipo === 'ELIMINATORIO') {
      const ok = executarOperador(criterio, edital, perfil ?? {})
      if (!ok) {
        falhas.push({
          criterio_id: criterio.id,
          nome: criterio.nome,
          mensagem: criterio.mensagem_reprovacao ?? 'Critério não atendido.',
        })
      }
    } else {
      const peso = Number(criterio.peso ?? 0)
      if (!peso) continue
      const score = pontoCriterio(criterio, edital, perfil ?? {})
      if (score == null) continue
      nota += peso * score
      pesoTotal += peso
    }
  }

  const notaFit = pesoTotal > 0 ? (nota / pesoTotal) * 100 : 100
  const status: StatusElegibilidade = falhas.length > 0 ? 'INELEGIVEL' : notaFit >= 70 ? 'ELEGIVEL' : notaFit >= 40 ? 'INDETERMINADO' : 'INELEGIVEL'

  return {
    status,
    nota_fit: Number(notaFit.toFixed(1)),
    falhas,
    resumo: falhas.length ? 'Com a configuração atual, o edital seria rejeitado pela regra eliminatória.' : 'Com a configuração atual, o edital continua compativel.',
  }
}

const STATUS_EDITAL_ATIVOS: StatusEdital[] = ['COLETADO', 'EM_ANALISE', 'ANALISADO', 'FALHA', 'EM_REVISAO', 'APROVADO']

function reavaliarEditaisAtivos(perfilAtualizadoEm: string): number {
  let total = 0
  for (const edital of repositorios.edital.listarPorStatus(STATUS_EDITAL_ATIVOS)) {
    const resultado = simularConfiguracao(edital.id)
    const nota = resultado.nota_fit
    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: edital.id,
      status_elegibilidade: resultado.status,
      nota_fit: nota,
      classificacao: nota >= 70 ? 'ALTO' : nota >= 40 ? 'MEDIO' : 'BAIXO',
      criterios_violados: resultado.falhas.map((falha) => ({
        criterio_id: falha.criterio_id,
        nome: falha.nome,
        motivo: falha.mensagem,
        evidencia_id: null,
      })),
      criterios_indeterminados: null,
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: perfilAtualizadoEm,
    })
    total++
  }
  return total
}

export const rotasEditais = Router()

let filaPerguntas = Promise.resolve()

function executarPerguntaSerialmente<T>(operacao: () => Promise<T>): Promise<T> {
  const anterior = filaPerguntas
  let liberar!: () => void
  filaPerguntas = new Promise<void>((resolve) => {
    liberar = resolve
  })
  return anterior.then(operacao).finally(liberar)
}

// Auxiliar para obter ID do usuário (ou gestor padrão se não houver cookie)
function obterUsuarioId(req: any): string {
  const cookie = req.headers.cookie?.split(';').map((x: string) => x.trim()).find((x: string) => x.startsWith('sessao_bhrendon='))?.slice(16)
  if (cookie) {
    const row = db.prepare('SELECT usuario_id FROM sessao WHERE id=? AND expira_em > ?').get(cookie, new Date().toISOString()) as { usuario_id: string } | undefined
    if (row?.usuario_id) return row.usuario_id
  }
  const gestor = db.prepare("SELECT id FROM usuario WHERE papel='GESTOR' LIMIT 1").get() as { id: string } | undefined
  return gestor?.id ?? '00000000-0000-0000-0000-000000000001'
}

// ---- Perfil, critérios, fontes e alertas (P06–P09) ----
rotasEditais.use((req, _res, next) => {
  garantirBootstraps()
  next()
})

rotasEditais.get('/perfil-empresa', (_req, res) => {
  res.json({ perfil: repositorios.perfilEmpresa.obter() ?? null })
})

rotasEditais.post('/perfil-empresa', (req, res) => {
  const payload = req.body ?? {}
  const perfil = {
    id: 1,
    razao_social: String(payload.razao_social ?? '').trim() || 'I9+ Consultoria e Inovação',
    nome_fantasia: payload.nome_fantasia ? String(payload.nome_fantasia).trim() : null,
    cnpj: String(payload.cnpj ?? '').trim() || '00.000.000/0000-00',
    cnae_principal: String(payload.cnae_principal ?? '').trim() || '0000-0/00',
    cnaes_secundarios: normalizarLista(payload.cnaes_secundarios),
    porte: String(payload.porte ?? 'ME'),
    natureza_juridica: String(payload.natureza_juridica ?? '').trim() || 'Sociedade Empresária Limitada',
    data_fundacao: String(payload.data_fundacao ?? '').trim() || '2020-01-01',
    faturamento_anual: payload.faturamento_anual == null || payload.faturamento_anual === '' ? null : Number(payload.faturamento_anual),
    uf: String(payload.uf ?? 'PR').trim().toUpperCase() || 'PR',
    municipio: String(payload.municipio ?? '').trim() || 'Curitiba',
    areas_atuacao: normalizarLista(payload.areas_atuacao),
    palavras_chave: normalizarLista(payload.palavras_chave),
    possui_ict_parceira: Boolean(payload.possui_ict_parceira),
    certidoes_disponiveis: normalizarLista(payload.certidoes_disponiveis),
    capacidade_contrapartida_percentual: payload.capacidade_contrapartida_percentual == null || payload.capacidade_contrapartida_percentual === '' ? null : Number(payload.capacidade_contrapartida_percentual),
    valor_minimo_interesse: payload.valor_minimo_interesse == null || payload.valor_minimo_interesse === '' ? null : Number(payload.valor_minimo_interesse),
    prazo_minimo_preparo_dias: payload.prazo_minimo_preparo_dias == null || payload.prazo_minimo_preparo_dias === '' ? null : Number(payload.prazo_minimo_preparo_dias),
  }

  const existente = repositorios.perfilEmpresa.obter()
  const reavaliar = Boolean(payload.reavaliar)
  let editaisReavaliados = 0
  const salvo = transacao(() => {
    const perfilSalvo = existente ? repositorios.perfilEmpresa.salvar(perfil) : repositorios.perfilEmpresa.inserir(perfil)
    repositorios.mensagem.excluirDeTodasConversas()
    if (reavaliar && perfilSalvo) {
      editaisReavaliados = reavaliarEditaisAtivos(perfilSalvo.atualizado_em)
    }
    return perfilSalvo
  })

  res.json({
    ok: true,
    perfil: salvo,
    reavaliacaoSolicitada: reavaliar,
    editaisReavaliados,
    chatsLimpos: true,
  })
})

rotasEditais.get('/criterios', (_req, res) => {
  const eliminatorios = repositorios.criterio.listarPorTipo('ELIMINATORIO')
  const pontuaveis = repositorios.criterio.listarPorTipo('PONTUAVEL')
  res.json({ eliminatorios, pontuaveis })
})

rotasEditais.post('/criterios', (req, res) => {
  const item = req.body ?? {}
  const dados = {
    id: item.id ?? novoId(),
    nome: String(item.nome ?? '').trim(),
    tipo: item.tipo === 'PONTUAVEL' ? 'PONTUAVEL' : 'ELIMINATORIO',
    campo_edital: String(item.campo_edital ?? '').trim(),
    campo_perfil: item.campo_perfil ? String(item.campo_perfil).trim() : null,
    operador: String(item.operador ?? 'CONTEM'),
    valor_referencia: item.valor_referencia == null || item.valor_referencia === '' ? null : String(item.valor_referencia),
    peso: item.peso == null || item.peso === '' ? null : Number(item.peso),
    mensagem_reprovacao: item.mensagem_reprovacao == null || item.mensagem_reprovacao === '' ? null : String(item.mensagem_reprovacao),
    ativo: item.ativo !== false,
    ordem: Number(item.ordem ?? 0),
  }

  if (!dados.nome || !dados.campo_edital || !dados.operador) {
    return res.status(400).json({ erro: 'Nome, campo e operador são obrigatórios.' })
  }

  const existente = repositorios.criterio.buscarPorId(dados.id)
  const salvo = existente ? repositorios.criterio.atualizar(dados.id, dados) : repositorios.criterio.inserir(dados)
  res.json({ ok: true, criterio: salvo })
})

rotasEditais.delete('/criterios/:id', (req, res) => {
  const removido = repositorios.criterio.excluir(req.params.id)
  res.json({ ok: true, removido })
})

rotasEditais.patch('/criterios/:id/ativo', (req, res) => {
  const criterio = repositorios.criterio.buscarPorId(req.params.id)
  if (!criterio) return res.status(404).json({ erro: 'Critério não encontrado.' })
  const atualizado = repositorios.criterio.atualizar(criterio.id, { ativo: !criterio.ativo })
  res.json({ ok: true, criterio: atualizado })
})

rotasEditais.post('/criterios/reordenar', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown) => typeof id === 'string') : []
  if (!ids.length) return res.status(400).json({ erro: 'Nenhum critério para reordenar.' })
  repositorios.criterio.reordenar(ids)
  res.json({ ok: true })
})

rotasEditais.post('/criterios/simular', (req, res) => {
  const { edital_id } = req.body ?? {}
  if (!edital_id) return res.status(400).json({ erro: 'Selecione um edital para simular.' })
  try {
    const simulacao = simularConfiguracao(String(edital_id))
    res.json({ ok: true, simulacao })
  } catch (erro: any) {
    res.status(400).json({ erro: erro.message ?? 'Não foi possível simular.' })
  }
})

rotasEditais.get('/alertas', (_req, res) => {
  const configuracoes = TIPOS_NOTIFICACAO.map((tipo) => repositorios.configAlerta.obter(tipo))
  const logs = repositorios.notificacaoLog.listar().slice(0, 20)
  res.json({ configuracoes, logs })
})

rotasEditais.post('/alertas', (req, res) => {
  const { tipo, ativo, destinatarios, parametros } = req.body ?? {}
  if (!tipo || !TIPOS_NOTIFICACAO.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de notificação inválido.' })
  }

  const existente = repositorios.configAlerta.obter(tipo)
  const dados = {
    tipo,
    ativo: Boolean(ativo),
    destinatarios: Array.isArray(destinatarios) ? destinatarios.map((item: any) => String(item).trim()).filter(Boolean) : existente.destinatarios,
    parametros: { ...existente.parametros, ...(parametros ?? {}) },
  }

  const salvo = repositorios.configAlerta.buscarPorId(tipo)
    ? repositorios.configAlerta.atualizar(tipo, dados)
    : repositorios.configAlerta.inserir(dados)

  res.json({ ok: true, configuracao: salvo })
})

rotasEditais.get('/alertas/logs', (_req, res) => {
  res.json({ logs: repositorios.notificacaoLog.listar().slice(0, 30) })
})

// ---- Fontes ----
rotasEditais.get('/fontes', (_req, res) => {
  const fontes = repositorios.fonte.listar().map((fonte) => {
    const ultimasExecucoes = db.prepare('SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT 10').all(fonte.id) as any[]
    return { ...fonte, execucoes: ultimasExecucoes }
  })
  res.json({ fontes })
})

rotasEditais.post('/fontes', (req, res) => {
  const dados = req.body ?? {}
  const payload = {
    id: dados.id ?? novoId(),
    nome: String(dados.nome ?? '').trim(),
    url_base: dados.url_base == null || dados.url_base === '' ? null : String(dados.url_base),
    tipo: String(dados.tipo ?? 'URL_MANUAL'),
    frequencia_cron: dados.frequencia_cron == null || dados.frequencia_cron === '' ? null : String(dados.frequencia_cron),
    ativo: dados.ativo !== false,
  }

  if (!payload.nome) return res.status(400).json({ erro: 'Nome da fonte é obrigatório.' })

  const existente = repositorios.fonte.buscarPorId(payload.id)
  const salvo = existente ? repositorios.fonte.atualizar(payload.id, payload) : repositorios.fonte.inserir(payload)
  res.json({ ok: true, fonte: salvo })
})

rotasEditais.patch('/fontes/:id/ativo', (req, res) => {
  const fonte = repositorios.fonte.buscarPorId(req.params.id)
  if (!fonte) return res.status(404).json({ erro: 'Fonte não encontrada.' })
  const atualizado = repositorios.fonte.atualizar(fonte.id, { ativo: !fonte.ativo })
  res.json({ ok: true, fonte: atualizado })
})

rotasEditais.post('/fontes/:id/coletar', async (req, res) => {
  const fonte = repositorios.fonte.buscarPorId(req.params.id)
  if (!fonte) return res.status(404).json({ erro: 'Fonte não encontrada.' })

  try {
    await new ColetaServico(repositorios).coletar(fonte)
    res.json({ ok: true, fonte: repositorios.fonte.buscarPorId(fonte.id) })
  } catch (erro: any) {
    res.status(400).json({ erro: erro.message ?? 'Falha ao disparar a coleta.' })
  }
})

// ---- Dashboard (P02 - Tarefa 14) ----
rotasEditais.get('/dashboard', (_req, res) => {
  const agoraIso = new Date().toISOString()
  const hojeStr = agoraIso.slice(0, 10)
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const seteDiasFrenteStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  // 1. Quatro cartões de contagem
  // Novos esta semana: criado_em nos últimos 7 dias
  const novosSemana = (
    db.prepare('SELECT COUNT(*) as n FROM edital WHERE criado_em >= ?').get(seteDiasAtras) as { n: number }
  ).n

  // Aguardando revisão: status ANALISADO ou EM_REVISAO
  const aguardandoRevisao = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status IN ('ANALISADO', 'EM_REVISAO')").get() as { n: number }
  ).n

  // Aprovados sem inscrição: status APROVADO
  const aprovadosSemInscricao = (
    db.prepare("SELECT COUNT(*) as n FROM edital WHERE status = 'APROVADO'").get() as { n: number }
  ).n

  // Prazo em até 7 dias: editais ativos com prazo_inscricao entre hoje e daqui a 7 dias
  const prazoUrgente = (
    db.prepare(
      `SELECT COUNT(*) as n FROM edital
       WHERE status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
         AND prazo_inscricao IS NOT NULL
         AND prazo_inscricao >= ?
         AND prazo_inscricao <= ?`
    ).get(hojeStr, seteDiasFrenteStr) as { n: number }
  ).n

  // 2. Cinco editais mais urgentes (menor prazo restante com status ativo)
  const editaisUrgentesRaw = db.prepare(
    `SELECT e.*, f.nome as fonte_nome,
            a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
     FROM edital e
     LEFT JOIN fonte f ON e.fonte_id = f.id
     LEFT JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     WHERE e.status NOT IN ('DESCARTADO', 'ENCERRADO', 'EXPIRADO')
       AND e.prazo_inscricao IS NOT NULL
     ORDER BY e.prazo_inscricao ASC
     LIMIT 5`
  ).all() as any[]

  const editaisUrgentes = editaisUrgentesRaw.map((e) => {
    const prazoDate = new Date(e.prazo_inscricao)
    const hojeDate = new Date()
    hojeDate.setHours(0, 0, 0, 0)
    prazoDate.setHours(0, 0, 0, 0)
    const diffDias = Math.ceil((prazoDate.getTime() - hojeDate.getTime()) / (1000 * 3600 * 24))
    return {
      ...e,
      dias_restantes: diffDias,
      urgente: diffDias >= 0 && diffDias <= 7,
    }
  })

  // 3. Top 5 de maior nota de fit (elegíveis ainda não decididos)
  const topFit = db.prepare(
    `SELECT e.*, f.nome as fonte_nome,
            a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
     FROM edital e
     JOIN avaliacao a ON a.id = (
       SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
     )
     LEFT JOIN fonte f ON e.fonte_id = f.id
     WHERE a.status_elegibilidade = 'ELEGIVEL'
       AND e.status NOT IN ('APROVADO', 'DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO')
     ORDER BY COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) DESC
     LIMIT 5`
  ).all()

  // 4. Distribuição por classificação (Alto / Médio / Baixo fit)
  const dist = db.prepare(
    `SELECT
       COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'ALTO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 70 THEN 1 END) as alto,
       COUNT(CASE WHEN (COALESCE(a.classificacao, '') = 'MEDIO' OR (COALESCE(a.nota_ajustada_manual, a.nota_fit) >= 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70)) AND COALESCE(a.nota_ajustada_manual, a.nota_fit) < 70 THEN 1 END) as medio,
       COUNT(CASE WHEN COALESCE(a.classificacao, '') = 'BAIXO' OR COALESCE(a.nota_ajustada_manual, a.nota_fit) < 40 THEN 1 END) as baixo,
       COUNT(*) as total
     FROM avaliacao a
     WHERE a.id IN (
       SELECT MAX(id) FROM avaliacao GROUP BY edital_id
     )`
  ).get() as { alto: number; medio: number; baixo: number; total: number }

  // 5. Painel de saúde da coleta (última execução de cada fonte)
  const fontes = db.prepare('SELECT * FROM fonte ORDER BY nome').all() as any[]
  const saudeColeta = fontes.map((f) => {
    const ultExec = db.prepare(
      'SELECT * FROM coleta_execucao WHERE fonte_id = ? ORDER BY iniciada_em DESC LIMIT 1'
    ).get(f.id) as any | undefined

    return {
      fonte_id: f.id,
      nome: f.nome,
      tipo: f.tipo,
      ativo: Boolean(f.ativo),
      ultima_coleta_em: f.ultima_coleta_em ?? ultExec?.finalizada_em ?? null,
      status: f.ultimo_status ?? ultExec?.status ?? (f.ativo ? 'PENDENTE' : 'INATIVO'),
      mensagem_erro: f.ultima_mensagem_erro ?? ultExec?.mensagem_erro ?? null,
      itens_coletados: ultExec?.itens_coletados ?? 0,
    }
  })

  res.json({
    cartoes: {
      novosSemana,
      aguardandoRevisao,
      aprovadosSemInscricao,
      prazoUrgente,
    },
    editaisUrgentes,
    topFit,
    distribuicao: dist ?? { alto: 0, medio: 0, baixo: 0, total: 0 },
    saudeColeta,
  })
})

// ---- Lista de Editais (P03 - Tarefa 12) ----
rotasEditais.get('/editais', (req, res) => {
  const {
    busca,
    status,
    elegibilidade,
    faixaFit,
    modalidade,
    fonte_id,
    prazoDe,
    prazoAte,
    somentePrazoAberto,
    novosSemana,
    prazoUrgente,
    formato,
  } = req.query

  const pagina = Math.max(1, Number(req.query.pagina ?? 1))
  const limite = Math.max(1, Math.min(100, Number(req.query.limite ?? 10)))
  const offset = (pagina - 1) * limite

  const condicoes: string[] = []
  const params: any[] = []

  // Busca textual por título, órgão financiador ou número
  if (busca && String(busca).trim()) {
    const termo = `%${String(busca).trim().toLowerCase()}%`
    condicoes.push('(LOWER(e.titulo) LIKE ? OR LOWER(COALESCE(e.orgao_financiador, "")) LIKE ? OR LOWER(COALESCE(e.numero_edital, "")) LIKE ?)')
    params.push(termo, termo, termo)
  }

  // Filtro de status (suporta múltiplos separados por vírgula, ex: ANALISADO,EM_REVISAO)
  if (status && String(status).trim() && String(status) !== 'TODOS') {
    const listaStatus = String(status).split(',').map((s) => s.trim()).filter(Boolean)
    if (listaStatus.length === 1) {
      condicoes.push('e.status = ?')
      params.push(listaStatus[0])
    } else if (listaStatus.length > 1) {
      condicoes.push(`e.status IN (${listaStatus.map(() => '?').join(', ')})`)
      params.push(...listaStatus)
    }
  }

  // Filtro de elegibilidade
  if (elegibilidade && String(elegibilidade).trim() && String(elegibilidade) !== 'TODAS') {
    condicoes.push('a.status_elegibilidade = ?')
    params.push(String(elegibilidade).trim())
  }

  // Filtro de faixa de nota
  if (faixaFit && String(faixaFit).trim() && String(faixaFit) !== 'TODAS') {
    const f = String(faixaFit).trim().toUpperCase()
    if (f === 'ALTO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) >= 70')
    } else if (f === 'MEDIO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) >= 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) < 70')
    } else if (f === 'BAIXO') {
      condicoes.push('COALESCE(a.nota_ajustada_manual, a.nota_fit, 0) < 40 AND COALESCE(a.nota_ajustada_manual, a.nota_fit) IS NOT NULL')
    }
  }

  // Filtro por modalidade
  if (modalidade && String(modalidade).trim() && String(modalidade) !== 'TODAS') {
    condicoes.push('e.modalidade = ?')
    params.push(String(modalidade).trim())
  }

  // Filtro por fonte
  if (fonte_id && String(fonte_id).trim() && String(fonte_id) !== 'TODAS') {
    condicoes.push('e.fonte_id = ?')
    params.push(String(fonte_id).trim())
  }

  // Intervalo de prazo
  if (prazoDe && String(prazoDe).trim()) {
    condicoes.push('e.prazo_inscricao >= ?')
    params.push(String(prazoDe).trim())
  }
  if (prazoAte && String(prazoAte).trim()) {
    condicoes.push('e.prazo_inscricao <= ?')
    params.push(String(prazoAte).trim())
  }

  // Somente com prazo aberto
  const hojeStr = new Date().toISOString().slice(0, 10)
  if (somentePrazoAberto === '1' || somentePrazoAberto === 'true') {
    condicoes.push("e.prazo_inscricao >= ? AND e.status NOT IN ('EXPIRADO', 'ENCERRADO', 'DESCARTADO')")
    params.push(hojeStr)
  }

  // Novos na semana
  if (novosSemana === '1' || novosSemana === 'true') {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    condicoes.push('e.criado_em >= ?')
    params.push(seteDiasAtras)
  }

  // Prazo em até 7 dias
  if (prazoUrgente === '1' || prazoUrgente === 'true') {
    const seteDiasFrenteStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    condicoes.push("e.prazo_inscricao >= ? AND e.prazo_inscricao <= ? AND e.status NOT IN ('EXPIRADO', 'ENCERRADO', 'DESCARTADO')")
    params.push(hojeStr, seteDiasFrenteStr)
  }

  const whereClausula = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

  // Ordenação padrão da especificação:
  // 1º elegibilidade (ELEGIVEL = 1, INDETERMINADO = 2, INELEGIVEL = 3, sem avaliação = 4)
  // 2º nota de fit decrescente
  // 3º prazo crescente
  const ordemClausula = `
    ORDER BY
      CASE
        WHEN a.status_elegibilidade = 'ELEGIVEL' THEN 1
        WHEN a.status_elegibilidade = 'INDETERMINADO' THEN 2
        WHEN a.status_elegibilidade = 'INELEGIVEL' THEN 3
        ELSE 4
      END ASC,
      COALESCE(a.nota_ajustada_manual, a.nota_fit, -1) DESC,
      CASE
        WHEN e.prazo_inscricao IS NULL THEN '9999-99-99'
        ELSE e.prazo_inscricao
      END ASC
  `

  // Contagem total para paginação
  const total = (
    db.prepare(
      `SELECT COUNT(*) as n
       FROM edital e
       LEFT JOIN avaliacao a ON a.id = (
         SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
       )
       ${whereClausula}`
    ).get(...params) as { n: number }
  ).n

  // Se exportação CSV requerida
  if (formato === 'csv') {
    const sqlExport = `
      SELECT e.*, f.nome as fonte_nome,
             a.status_elegibilidade, a.nota_fit, a.nota_ajustada_manual
      FROM edital e
      LEFT JOIN fonte f ON e.fonte_id = f.id
      LEFT JOIN avaliacao a ON a.id = (
        SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
      )
      ${whereClausula}
      ${ordemClausula}
    `
    const linhas = db.prepare(sqlExport).all(...params) as any[]

    const escapeCsv = (str: any) => {
      if (str == null) return '""'
      const s = String(str).replace(/"/g, '""')
      return `"${s}"`
    }

    const cabecalhoCsv = [
      'Título',
      'Órgão Financiador',
      'Modalidade',
      'Prazo de Inscrição',
      'Valor Máximo (R$)',
      'Elegibilidade',
      'Nota de Fit',
      'Status',
      'Fonte',
    ].join(';')

    const linhasCsv = linhas.map((l) => {
      const nota = l.nota_ajustada_manual ?? l.nota_fit ?? ''
      const eleg = ELEGIBILIDADE[l.status_elegibilidade] ?? l.status_elegibilidade ?? 'Sem avaliação'
      const mod = MODALIDADES[l.modalidade] ?? l.modalidade ?? ''
      const st = STATUS_EDITAL[l.status] ?? l.status ?? ''
      const valor = l.valor_maximo_por_projeto != null ? l.valor_maximo_por_projeto.toLocaleString('pt-BR') : ''

      return [
        escapeCsv(l.titulo),
        escapeCsv(l.orgao_financiador),
        escapeCsv(mod),
        escapeCsv(l.prazo_inscricao),
        escapeCsv(valor),
        escapeCsv(eleg),
        escapeCsv(nota),
        escapeCsv(st),
        escapeCsv(l.fonte_nome),
      ].join(';')
    })

    const csvCompleto = '\uFEFF' + [cabecalhoCsv, ...linhasCsv].join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="editais-filtrados.csv"')
    return res.send(csvCompleto)
  }

  // Consulta paginada
  const sqlBusca = `
    SELECT e.*, f.nome as fonte_nome,
           a.status_elegibilidade, a.nota_fit, a.classificacao, a.nota_ajustada_manual
    FROM edital e
    LEFT JOIN fonte f ON e.fonte_id = f.id
    LEFT JOIN avaliacao a ON a.id = (
      SELECT id FROM avaliacao WHERE edital_id = e.id ORDER BY calculado_em DESC LIMIT 1
    )
    ${whereClausula}
    ${ordemClausula}
    LIMIT ? OFFSET ?
  `
  const itensRaw = db.prepare(sqlBusca).all(...params, limite, offset) as any[]

  const hojeDate = new Date()
  hojeDate.setHours(0, 0, 0, 0)

  const itens = itensRaw.map((e) => {
    let dias_restantes: number | null = null
    let prazo_urgente = false

    if (e.prazo_inscricao) {
      const prazoDate = new Date(e.prazo_inscricao)
      prazoDate.setHours(0, 0, 0, 0)
      dias_restantes = Math.ceil((prazoDate.getTime() - hojeDate.getTime()) / (1000 * 3600 * 24))
      prazo_urgente = dias_restantes >= 0 && dias_restantes <= 7
    }

    return {
      ...e,
      dias_restantes,
      prazo_urgente,
    }
  })

  res.json({
    itens,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  })
})

// ---- Ações em lote (Aprovar / Descartar - Tarefa 12) ----
rotasEditais.post('/editais/lote', (req, res) => {
  const { ids, acao, comentario } = req.body ?? {}

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ erro: 'Selecione ao menos um edital para ação em lote.' })
  }

  if (acao !== 'APROVAR' && acao !== 'DESCARTAR') {
    return res.status(400).json({ erro: 'Ação em lote inválida. Use APROVAR ou DESCARTAR.' })
  }

  if (acao === 'DESCARTAR' && (!comentario || !String(comentario).trim())) {
    return res.status(400).json({ erro: 'Justificativa obrigatória para descarte em lote.' })
  }

  const usuarioId = obterUsuarioId(req)
  const novoStatus: StatusEdital = acao === 'APROVAR' ? 'APROVADO' : 'DESCARTADO'
  const acaoRevisao = acao === 'APROVAR' ? 'APROVOU' : 'DESCARTOU'
  const justificativa = comentario ? String(comentario).trim() : null
  const agoraIso = new Date().toISOString()

  transacao(() => {
    for (const id of ids) {
      const editalAtual = db.prepare('SELECT status FROM edital WHERE id = ?').get(id) as { status: StatusEdital } | undefined
      if (editalAtual) {
        db.prepare('UPDATE edital SET status = ?, atualizado_em = ? WHERE id = ?').run(novoStatus, agoraIso, id)
        db.prepare(
          `INSERT INTO revisao (id, edital_id, usuario_id, acao, valor_anterior, valor_novo, comentario, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(novoId(), id, usuarioId, acaoRevisao, editalAtual.status, novoStatus, justificativa, agoraIso)
      }
    }
  })

  res.json({
    ok: true,
    total: ids.length,
    status: novoStatus,
  })
})

// ---- Nova Entrada (P05 - Tarefa 13) ----
rotasEditais.post('/editais', async (req, res) => {
  const { tipo = 'MANUAL' } = req.body ?? {}
  const agoraIso = new Date().toISOString()

  // 1. Upload de PDF (arrastar e soltar com limite de 20 MB)
  if (tipo === 'UPLOAD_PDF') {
    const { arquivo_base64, nome_arquivo, fonte_id } = req.body

    if (!arquivo_base64 || typeof arquivo_base64 !== 'string') {
      return res.status(400).json({ erro: 'Arquivo PDF não fornecido.' })
    }

    // Validação estrita do limite de 20 MB
    const buffer = Buffer.from(arquivo_base64, 'base64')
    const limiteBytes = 20 * 1024 * 1024
    if (buffer.length > limiteBytes) {
      return res.status(400).json({
        erro: `O arquivo enviado (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) excede o limite máximo permitido de 20 MB.`,
      })
    }

    let textoPdf
    try {
      textoPdf = await extrairPdf(buffer)
    } catch {
      return res.status(400).json({ erro: 'Não foi possível ler este PDF. Verifique se o arquivo está íntegro e tente novamente.' })
    }

    if (!textoPdf.paginas.some((pagina) => pagina.texto.trim())) {
      return res.status(422).json({
        erro: 'Este PDF não contém texto selecionável. Aplique OCR ao documento e envie novamente para habilitar o chat.',
      })
    }

    // Calcula hash SHA-256 do documento
    const hash = createHash('sha256').update(buffer).digest('hex')

    // Deduplicação: se o edital já existir pelo hash, avisa e devolve o existente
    const duplicado = repositorios.edital.buscarDuplicado({
      hash_documento: hash,
      url_documento: null,
      numero_edital: null,
      orgao_financiador: null,
    })

    if (duplicado) {
      if (!duplicado.texto_extraido?.trim() || ehMarcadorDeTextoPdf(duplicado.texto_extraido)) {
        repositorios.edital.atualizar(duplicado.id, {
          texto_extraido: textoPdf.texto,
          erro_processamento: textoPdf.requerLeituraManual
            ? 'Requer leitura manual: uma ou mais páginas não têm camada de texto.'
            : null,
        })
        return res.json({
          ok: true,
          id: duplicado.id,
          duplicado: true,
          mensagem: 'O edital existente foi atualizado com o texto extraído do PDF.',
        })
      }

      return res.json({
        ok: true,
        id: duplicado.id,
        duplicado: true,
        mensagem: 'Edital já cadastrado com o mesmo documento.',
      })
    }

    const fonteValida = fonte_id || repositorios.fonte.buscarPorNome('Upload manual')?.id || repositorios.fonte.listar()[0]?.id
    const nomeLimpo = (nome_arquivo || 'Edital Importado')
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
    const titulo = nomeLimpo.length > 5 ? nomeLimpo : `Edital via Upload - ${nomeLimpo}`

    const novoEdital = repositorios.edital.inserir({
      id: novoId(),
      titulo,
      fonte_id: fonteValida,
      hash_documento: hash,
      status: 'COLETADO',
      texto_extraido: textoPdf.texto,
      erro_processamento: textoPdf.requerLeituraManual ? 'Requer leitura manual: uma ou mais páginas não têm camada de texto.' : null,
      retificado: false,
    })

    // Avaliação preliminar
    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: novoEdital.id,
      status_elegibilidade: 'INDETERMINADO',
      nota_fit: 50,
      classificacao: 'MEDIO',
      criterios_violados: null,
      criterios_indeterminados: [
        {
          criterio_id: 'leitura_pendente',
          nome: 'Análise de documento em processamento',
          campo_faltante: 'Dados em extração',
        },
      ],
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: null,
    })

    return res.json({ ok: true, id: novoEdital.id })
  }

  // 2. Colagem de URL do edital
  if (tipo === 'URL') {
    const { url, fonte_id } = req.body

    if (!url || !String(url).trim()) {
      return res.status(400).json({ erro: 'Endereço URL do edital é obrigatório.' })
    }

    const urlLimpa = String(url).trim()
    if (!/^https?:\/\//i.test(urlLimpa)) {
      return res.status(400).json({ erro: 'Informe uma URL válida iniciando com http:// ou https://.' })
    }

    // Deduplicação por URL
    const duplicado = repositorios.edital.buscarDuplicado({
      hash_documento: null,
      url_documento: urlLimpa,
      numero_edital: null,
      orgao_financiador: null,
    })

    if (duplicado) {
      return res.json({
        ok: true,
        id: duplicado.id,
        duplicado: true,
        mensagem: 'Edital já cadastrado com esta URL de origem.',
      })
    }

    let dominio = 'Portal de Fomento'
    try {
      dominio = new URL(urlLimpa).hostname.replace(/^www\./i, '')
    } catch {}

    const fonteValida = fonte_id || repositorios.fonte.buscarPorNome('URL manual')?.id || repositorios.fonte.listar()[0]?.id
    const titulo = `Chamada Pública identificada em ${dominio}`

    const novoEdital = repositorios.edital.inserir({
      id: novoId(),
      titulo,
      fonte_id: fonteValida,
      url_original: urlLimpa,
      url_documento: urlLimpa,
      status: 'COLETADO',
      retificado: false,
    })

    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: novoEdital.id,
      status_elegibilidade: 'INDETERMINADO',
      nota_fit: 50,
      classificacao: 'MEDIO',
      criterios_violados: null,
      criterios_indeterminados: null,
      detalhamento_pontuacao: null,
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: null,
    })

    return res.json({ ok: true, id: novoEdital.id })
  }

  // 3. Cadastro manual dos campos
  const {
    titulo,
    orgao_financiador,
    numero_edital,
    modalidade,
    fonte_id,
    data_publicacao,
    prazo_inscricao,
    data_resultado_prevista,
    valor_total_disponivel,
    valor_maximo_por_projeto,
    exige_contrapartida,
    percentual_contrapartida,
    publico_alvo,
    cnaes_aceitos,
    portes_aceitos,
    natureza_juridica_aceita,
    abrangencia_geografica,
    exige_ict_parceira,
    tempo_minimo_fundacao_meses,
    faturamento_minimo,
    faturamento_maximo,
    certidoes_exigidas,
    areas_tematicas,
    permite_submissao_multipla,
    resumo_executivo,
  } = req.body

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ erro: 'O título do edital é obrigatório.' })
  }

  const fonteValida = fonte_id || repositorios.fonte.listar()[0]?.id

  const editalManual = repositorios.edital.inserir({
    id: novoId(),
    titulo: String(titulo).trim(),
    orgao_financiador: orgao_financiador ? String(orgao_financiador).trim() : null,
    numero_edital: numero_edital ? String(numero_edital).trim() : null,
    modalidade: modalidade || null,
    fonte_id: fonteValida,
    data_publicacao: data_publicacao || null,
    prazo_inscricao: prazo_inscricao || null,
    data_resultado_prevista: data_resultado_prevista || null,
    valor_total_disponivel: valor_total_disponivel != null && valor_total_disponivel !== '' ? Number(valor_total_disponivel) : null,
    valor_maximo_por_projeto: valor_maximo_por_projeto != null && valor_maximo_por_projeto !== '' ? Number(valor_maximo_por_projeto) : null,
    exige_contrapartida: typeof exige_contrapartida === 'boolean' ? exige_contrapartida : null,
    percentual_contrapartida: percentual_contrapartida != null && percentual_contrapartida !== '' ? Number(percentual_contrapartida) : null,
    publico_alvo: Array.isArray(publico_alvo) ? publico_alvo : typeof publico_alvo === 'string' && publico_alvo ? publico_alvo.split(',').map((s) => s.trim()) : null,
    cnaes_aceitos: Array.isArray(cnaes_aceitos) ? cnaes_aceitos : typeof cnaes_aceitos === 'string' && cnaes_aceitos ? cnaes_aceitos.split(',').map((s) => s.trim()) : null,
    portes_aceitos: Array.isArray(portes_aceitos) ? portes_aceitos : typeof portes_aceitos === 'string' && portes_aceitos ? portes_aceitos.split(',').map((s) => s.trim()) : null,
    natureza_juridica_aceita: Array.isArray(natureza_juridica_aceita) ? natureza_juridica_aceita : typeof natureza_juridica_aceita === 'string' && natureza_juridica_aceita ? natureza_juridica_aceita.split(',').map((s) => s.trim()) : null,
    abrangencia_geografica: Array.isArray(abrangencia_geografica) ? abrangencia_geografica : typeof abrangencia_geografica === 'string' && abrangencia_geografica ? abrangencia_geografica.split(',').map((s) => s.trim()) : null,
    exige_ict_parceira: typeof exige_ict_parceira === 'boolean' ? exige_ict_parceira : null,
    tempo_minimo_fundacao_meses: tempo_minimo_fundacao_meses != null && tempo_minimo_fundacao_meses !== '' ? Number(tempo_minimo_fundacao_meses) : null,
    faturamento_minimo: faturamento_minimo != null && faturamento_minimo !== '' ? Number(faturamento_minimo) : null,
    faturamento_maximo: faturamento_maximo != null && faturamento_maximo !== '' ? Number(faturamento_maximo) : null,
    certidoes_exigidas: Array.isArray(certidoes_exigidas) ? certidoes_exigidas : typeof certidoes_exigidas === 'string' && certidoes_exigidas ? certidoes_exigidas.split(',').map((s) => s.trim()) : null,
    areas_tematicas: Array.isArray(areas_tematicas) ? areas_tematicas : typeof areas_tematicas === 'string' && areas_tematicas ? areas_tematicas.split(',').map((s) => s.trim()) : null,
    permite_submissao_multipla: typeof permite_submissao_multipla === 'boolean' ? permite_submissao_multipla : null,
    resumo_executivo: resumo_executivo ? String(resumo_executivo).trim() : null,
    status: 'ANALISADO',
    retificado: false,
  })

  // Calcula fit preliminar para cadastro manual
  let notaFit = 75
  let elegibilidadeCalc: StatusElegibilidade = 'ELEGIVEL'
  let classificacao: Classificacao = 'ALTO'

  if (editalManual.areas_tematicas?.some((a) => /esg|bateria|energia|sustentabilidade/i.test(a))) {
    notaFit = 85
  }

  repositorios.avaliacao.inserir({
    id: novoId(),
    edital_id: editalManual.id,
    status_elegibilidade: elegibilidadeCalc,
    nota_fit: notaFit,
    classificacao,
    criterios_violados: null,
    criterios_indeterminados: null,
    detalhamento_pontuacao: [
      { criterio_id: 'cadastro_manual', peso: 10, pontuacao: 0.8, contribuicao: notaFit },
    ],
    nota_ajustada_manual: null,
    ajustada_por: null,
    perfil_atualizado_em: null,
  })

  res.json({ ok: true, id: editalManual.id })
})

// ---- Detalhe do Edital (P04) ----
rotasEditais.get('/editais/:id', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const avaliacao = repositorios.avaliacao.ultimaDoEdital(edital.id) ?? null
  const evidencias = repositorios.evidencia.listarDoEdital(edital.id)
  const revisoes = repositorios.revisao.listarDoEdital(edital.id)

  res.json({
    edital,
    avaliacao,
    evidencias,
    revisoes,
  })
})

rotasEditais.patch('/editais/:id/campos', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  let alteracoes: Partial<Edital>
  try {
    alteracoes = validarCamposManuais(req.body?.campos)
  } catch (erro) {
    return res.status(400).json({ erro: erro instanceof Error ? erro.message : 'Os campos informados são inválidos.' })
  }

  const camposAtualizados = Object.keys(alteracoes) as CampoEditavel[]
  const atualizado = transacao(() => {
    const registro = repositorios.edital.atualizar(edital.id, alteracoes)
    for (const campo of camposAtualizados) {
      repositorios.evidencia.excluirDoCampo(edital.id, campo)
      repositorios.evidencia.inserir({
        id: novoId(),
        edital_id: edital.id,
        campo,
        trecho_literal: MARCADOR_EDICAO_MANUAL,
        pagina: null,
        confianca: null,
      })
    }
    return registro
  })

  return res.json({
    edital: atualizado,
    campos: camposAtualizados,
    mensagem: 'Dados atualizados manualmente.',
  })
})

rotasEditais.post('/editais/:id/extrair-dados', async (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  if (!edital.texto_extraido?.trim() || ehMarcadorDeTextoPdf(edital.texto_extraido)) {
    return res.status(422).json({ erro: 'Este edital não possui texto extraído. Envie um PDF com texto selecionável antes de extrair os dados.' })
  }

  try {
    const extracao = await extrairCamposDoEdital(edital.id, edital.texto_extraido)
    const camposAtualizados = salvarCamposExtraidos(edital, extracao)

    return res.json({
      edital: repositorios.edital.buscarPorId(edital.id),
      atualizados: camposAtualizados.length,
      campos: camposAtualizados,
      mensagem: camposAtualizados.length
        ? `${camposAtualizados.length} campo(s) preenchido(s) com evidência do documento.`
        : 'Não foram encontrados novos campos com evidência verificável. Os dados existentes foram preservados.',
    })
  } catch (erro) {
    console.error('Falha ao extrair dados estruturados do edital com Ollama:', erro)
    const status = erro instanceof ErroOllama ? erro.statusCode : 500
    const mensagem = erro instanceof ErroOllama ? erro.message : 'Não foi possível extrair os dados do edital.'
    return res.status(status).json({ erro: mensagem })
  }
})

rotasEditais.post('/editais/:id/ler-url', async (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  const url = edital.url_original ?? edital.url_documento
  if (!url) return res.status(422).json({ erro: 'Este edital não tem uma URL cadastrada para leitura.' })

  try {
    const pagina = await lerPaginaPublica(url)
    const textoAnterior = edital.texto_extraido?.trim()
      ? semConteudoWebAnterior(edital.texto_extraido)
      : ''
    const textoExtraido = textoAnterior
      ? `${textoAnterior}\n\n${pagina.texto}`
      : pagina.texto
    const tituloAtualizado = pagina.titulo && /^Chamada Pública identificada em /i.test(edital.titulo)
      ? pagina.titulo
      : edital.titulo
    const editalComPagina = repositorios.edital.atualizar(edital.id, {
      texto_extraido: textoExtraido,
      titulo: tituloAtualizado,
      erro_processamento: null,
    })
    if (!editalComPagina) throw new Error('O edital deixou de existir durante a leitura da página.')

    let camposAtualizados: CampoEditalExtraido[] = []
    try {
      const extracao = await extrairCamposDoEdital(edital.id, textoExtraido)
      camposAtualizados = salvarCamposExtraidos(editalComPagina, extracao)
    } catch (erro) {
      console.error('A página foi lida, mas a extração estruturada com Ollama falhou:', erro)
      const detalhe = erro instanceof ErroOllama ? erro.message : 'Não foi possível extrair os campos com IA.'
      return res.status(502).json({
        erro: `O conteúdo da página foi salvo para o chat, mas a extração de campos falhou: ${detalhe}`,
        textoSalvo: true,
      })
    }

    return res.json({
      edital: repositorios.edital.buscarPorId(edital.id),
      atualizados: camposAtualizados.length,
      campos: camposAtualizados,
      mensagem: `Página lida e conteúdo adicionado ao contexto do chat. ${camposAtualizados.length} campo(s) preenchido(s) com evidência verificável.`,
    })
  } catch (erro) {
    console.error('Falha ao ler a URL pública do edital:', erro)
    return res.status(erro instanceof Error && /HTTP \d+/.test(erro.message) ? 502 : 422).json({
      erro: erro instanceof Error ? erro.message : 'Não foi possível ler o conteúdo da URL.',
    })
  }
})

// ---- Chat sobre o edital ----
rotasEditais.get('/editais/:id/chat', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const usuarioId = obterUsuarioId(req)
  const conversa = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
  const limite = repositorios.config.obterNumero('chat_limite_diario', 20)
  const inicioDoDia = new Date()
  inicioDoDia.setHours(0, 0, 0, 0)
  const feitasHoje = repositorios.mensagem.contarPerguntasDoUsuarioDesde(usuarioId, inicioDoDia.toISOString())

  res.json({
    mensagens: conversa ? repositorios.mensagem.listarDaConversa(conversa.id) : [],
    limite,
    restantes: Math.max(0, limite - feitasHoje),
  })
})

rotasEditais.post('/editais/:id/chat', async (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const pergunta = req.body?.pergunta
  const textoEdital = edital.texto_extraido
  if (typeof pergunta !== 'string' || !pergunta.trim()) {
    return res.status(400).json({ erro: 'Digite uma pergunta sobre o edital.' })
  }
  if (pergunta.trim().length > 2000) {
    return res.status(400).json({ erro: 'A pergunta deve ter no máximo 2.000 caracteres.' })
  }
  if (!textoEdital?.trim()) {
    return res.status(409).json({ erro: 'Este edital ainda não tem texto extraído para consultar.' })
  }

  return executarPerguntaSerialmente(async () => {
    const usuarioId = obterUsuarioId(req)
    const limite = repositorios.config.obterNumero('chat_limite_diario', 20)
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    const feitasHoje = repositorios.mensagem.contarPerguntasDoUsuarioDesde(usuarioId, inicioDoDia.toISOString())

    if (feitasHoje >= limite) {
      return res.status(429).json({
        erro: 'Você atingiu o limite diário de perguntas do chat.',
        limite,
        restantes: 0,
      })
    }

    const conversaExistente = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
    const historico = conversaExistente
      ? repositorios.mensagem.ultimasDaConversa(conversaExistente.id, 6)
      : []
    res.status(200)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    res.write(`${JSON.stringify({
      tipo: 'status',
      mensagem: 'Enviando o edital completo ao Ollama. A resposta pode demorar um pouco mais…',
    })}\n`)

    const controlador = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) controlador.abort()
    })

    let conteudo = ''
    try {
      for await (const trecho of transmitirRespostaSobreEdital(
        textoEdital,
        pergunta.trim(),
        historico.map(({ papel, conteudo: texto }) => ({ papel, conteudo: texto })),
        fetch,
        controlador.signal,
        repositorios.perfilEmpresa.obter() ?? null,
      )) {
        conteudo += trecho
        res.write(`${JSON.stringify({ tipo: 'trecho', conteudo: trecho })}\n`)
      }
    } catch (erro) {
      if (res.destroyed) return
      console.error('Falha ao gerar resposta do chat com Ollama:', erro)
      const mensagem = erro instanceof ErroOllama
        ? erro.message
        : 'Não foi possível obter uma resposta do assistente.'
      res.write(`${JSON.stringify({ tipo: 'erro', mensagem })}\n`)
      return res.end()
    }

    const agoraIso = new Date().toISOString()
    const conversa = transacao(() => {
      const conversa = conversaExistente ?? repositorios.conversa.inserir({
        id: novoId(),
        edital_id: edital.id,
        usuario_id: usuarioId,
      })
      repositorios.mensagem.inserir({
        id: novoId(),
        conversa_id: conversa.id,
        papel: 'USUARIO',
        conteudo: pergunta.trim(),
      })
      repositorios.mensagem.inserir({
        id: novoId(),
        conversa_id: conversa.id,
        papel: 'ASSISTENTE',
        conteudo,
      })
      repositorios.conversa.atualizar(conversa.id, { atualizada_em: agoraIso })
      return conversa
    })

    const feitasDepois = feitasHoje + 1
    res.write(`${JSON.stringify({
      tipo: 'concluido',
      mensagens: repositorios.mensagem.listarDaConversa(conversa.id),
      limite,
      restantes: Math.max(0, limite - feitasDepois),
    })}\n`)
    return res.end()
  })
})

rotasEditais.delete('/editais/:id/chat', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const usuarioId = obterUsuarioId(req)
  const conversa = repositorios.conversa.buscarDoUsuario(edital.id, usuarioId)
  if (conversa) repositorios.mensagem.excluirDaConversa(conversa.id)
  res.json({ ok: true })
})

// ---- Ação de revisão individual ----
rotasEditais.post('/editais/:id/revisao', (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })

  const { acao, comentario } = req.body ?? {}
  if (!['APROVOU', 'DESCARTOU', 'MARCOU_INSCRITO', 'REGISTROU_RESULTADO', 'AJUSTOU_NOTA'].includes(acao)) {
    return res.status(400).json({ erro: 'Ação inválida.' })
  }

  if (acao === 'DESCARTOU' && (!comentario || !String(comentario).trim())) {
    return res.status(400).json({ erro: 'Informe um comentário para descartar.' })
  }

  const mapaStatus: Record<string, StatusEdital> = {
    APROVOU: 'APROVADO',
    DESCARTOU: 'DESCARTADO',
    MARCOU_INSCRITO: 'INSCRITO',
    REGISTROU_RESULTADO: 'ENCERRADO',
  }

  const novoStatus = mapaStatus[acao]
  const agoraIso = new Date().toISOString()
  const usuarioId = obterUsuarioId(req)

  if (novoStatus) {
    repositorios.edital.atualizar(edital.id, { status: novoStatus })
  }

  const revisao = repositorios.revisao.inserir({
    id: novoId(),
    edital_id: edital.id,
    usuario_id: usuarioId,
    acao,
    comentario: comentario ? String(comentario).trim() : null,
    valor_anterior: edital.status,
    valor_novo: novoStatus ?? null,
  })

  res.json({
    revisao,
    edital: repositorios.edital.buscarPorId(edital.id),
  })
})
