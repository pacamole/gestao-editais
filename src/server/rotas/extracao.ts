import { Router } from 'express'
import { repositorios } from '../repositorios/index.js'
import { ollamaUrl } from '../config/sistema.js'
import { ErroOllama, extrairCamposDoEdital, type CampoEditalExtraido } from '../chat/ollama.js'
import { ehMarcadorDeTextoPdf } from '../coleta/pdf.js'
import { lerPaginaPublica } from '../coleta/pagina.js'
import { salvarCamposExtraidos, semConteudoWebAnterior } from '../servicos/extracaoEdital.js'
import type { ExtracaoResposta } from '../../shared/tipos/edital.js'

export const rotasExtracao = Router()

rotasExtracao.post('/editais/:id/extrair-dados', async (req, res) => {
  const edital = repositorios.edital.buscarPorId(req.params.id)
  if (!edital) return res.status(404).json({ erro: 'Edital não encontrado.' })
  if (!edital.texto_extraido?.trim() || ehMarcadorDeTextoPdf(edital.texto_extraido)) {
    return res.status(422).json({ erro: 'Este edital não possui texto extraído. Envie um PDF com texto selecionável antes de extrair os dados.' })
  }

  try {
    const extracao = await extrairCamposDoEdital(edital.id, edital.texto_extraido, fetch, ollamaUrl())
    const camposAtualizados = salvarCamposExtraidos(edital, extracao)

    return res.json({
      edital: repositorios.edital.buscarPorId(edital.id)!,
      atualizados: camposAtualizados.length,
      campos: camposAtualizados,
      mensagem: camposAtualizados.length
        ? `${camposAtualizados.length} campo(s) preenchido(s) com evidência do documento.`
        : 'Não foram encontrados novos campos com evidência verificável. Os dados existentes foram preservados.',
    } satisfies ExtracaoResposta)
  } catch (erro) {
    console.error('Falha ao extrair dados estruturados do edital com Ollama:', erro)
    const status = erro instanceof ErroOllama ? erro.statusCode : 500
    const mensagem = erro instanceof ErroOllama ? erro.message : 'Não foi possível extrair os dados do edital.'
    return res.status(status).json({ erro: mensagem })
  }
})

rotasExtracao.post('/editais/:id/ler-url', async (req, res) => {
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
      const extracao = await extrairCamposDoEdital(edital.id, textoExtraido, fetch, ollamaUrl())
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
      edital: repositorios.edital.buscarPorId(edital.id)!,
      atualizados: camposAtualizados.length,
      campos: camposAtualizados,
      mensagem: `Página lida e conteúdo adicionado ao contexto do chat. ${camposAtualizados.length} campo(s) preenchido(s) com evidência verificável.`,
    } satisfies ExtracaoResposta)
  } catch (erro) {
    console.error('Falha ao ler a URL pública do edital:', erro)
    return res.status(erro instanceof Error && /HTTP \d+/.test(erro.message) ? 502 : 422).json({
      erro: erro instanceof Error ? erro.message : 'Não foi possível ler o conteúdo da URL.',
    })
  }
})
