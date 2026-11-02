import { buscarTrechos, juntarTrechos, trechosDoEdital, type TrechoEdital } from './indiceEdital.js'

// O que do edital vai para o modelo, no chat e na extração: o documento inteiro quando cabe;
// quando não cabe, os trechos mais relevantes até o limite. Um lugar só decide isso.

export type ContextoEdital = { texto: string; completo: boolean }

// Por baixo: em português o modelo gasta de 3 a 4 caracteres por token.
const CARACTERES_POR_TOKEN = 3

/** Caracteres do edital que cabem no pedido, descontado o resto dele (instruções, perfil, histórico e resposta). */
export function caracteresDisponiveis(limiteTokens: number, reservaTokens: number): number {
  return Math.max(0, (limiteTokens - reservaTokens) * CARACTERES_POR_TOKEN)
}

// Um grupo de campos por consulta: no recorte, cada grupo tem a sua vez, para nenhum ficar de fora.
export const CONSULTAS_EXTRACAO = [
  'órgão financiador instituição promotora número edital chamada modalidade',
  'data de publicação cronograma calendário prazo término inscrição submissão envio proposta propostas resultado',
  'valor total disponível orçamento recursos financeiros valor máximo limite por projeto',
  'contrapartida percentual exigido aporte financeiro',
  'público-alvo proponentes beneficiários quem pode participar',
  'CNAE atividades econômicas aceitas',
  'porte da empresa microempresa pequena empresa porte aceito',
  'abrangência geográfica estados municípios região',
  'áreas temáticas linhas de apoio objetivo objeto da chamada',
  'natureza jurídica sociedade empresária tipo de pessoa jurídica elegível',
  'tempo mínimo de constituição fundação anos de existência da empresa',
  'receita bruta anual faturamento mínimo máximo',
  'instituição científica tecnológica ICT parceria cooperação',
  'certidões negativas regularidade fiscal documentos de habilitação',
  'número de propostas por proponente submissão múltipla',
]

/** Extração: o edital inteiro; se não couber, trechos escolhidos em rodadas, um por grupo de campos por vez. */
export function contextoParaExtracao(editalId: string, texto: string, limite: number): ContextoEdital {
  if (texto.length <= limite) return { texto, completo: true }

  const filas = CONSULTAS_EXTRACAO.map((consulta) => buscarTrechos(editalId, texto, consulta))
  const escolhidos = new Map<number, TrechoEdital>()
  let total = 0
  let acrescentou = true
  while (acrescentou) {
    acrescentou = false
    for (const fila of filas) {
      // O próximo trecho desta consulta que ainda não entrou e que cabe.
      while (fila.length) {
        const trecho = fila.shift()!
        if (escolhidos.has(trecho.ordem) || total + trecho.texto.length + 2 > limite) continue
        escolhidos.set(trecho.ordem, trecho)
        total += trecho.texto.length + 2
        acrescentou = true
        break
      }
    }
  }
  return { texto: juntarTrechos(escolhidos.values()), completo: false }
}

/** Chat: o edital inteiro; se não couber, os trechos ligados à pergunta (ou o começo, se nenhum for). */
export function contextoParaPergunta(editalId: string, texto: string, pergunta: string, limite: number): ContextoEdital {
  if (texto.length <= limite) return { texto, completo: true }

  const relacionados = buscarTrechos(editalId, texto, pergunta)
  const candidatos = relacionados.length ? relacionados : trechosDoEdital(editalId, texto)
  const escolhidos: TrechoEdital[] = []
  let total = 0
  for (const trecho of candidatos) {
    if (total + trecho.texto.length + 2 > limite) continue
    escolhidos.push(trecho)
    total += trecho.texto.length + 2
  }
  return { texto: juntarTrechos(escolhidos), completo: false }
}
