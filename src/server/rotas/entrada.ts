import { Router } from 'express'
import { createHash } from 'node:crypto'
import { novoId } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import type { Classificacao, StatusElegibilidade } from '../dominio/entidades.js'
import { ehMarcadorDeTextoPdf, extrairPdf } from '../coleta/pdf.js'
import type { CriarEditalResposta } from '../../shared/tipos/editais.js'

export const rotasEntrada = Router()

// ---- Nova Entrada (P05 - Tarefa 13) ----
rotasEntrada.post('/editais', async (req, res) => {
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
        } satisfies CriarEditalResposta)
      }

      return res.json({
        ok: true,
        id: duplicado.id,
        duplicado: true,
        mensagem: 'Edital já cadastrado com o mesmo documento.',
      } satisfies CriarEditalResposta)
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

    return res.json({ ok: true, id: novoEdital.id } satisfies CriarEditalResposta)
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
      } satisfies CriarEditalResposta)
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

    return res.json({ ok: true, id: novoEdital.id } satisfies CriarEditalResposta)
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

  res.json({ ok: true, id: editalManual.id } satisfies CriarEditalResposta)
})
