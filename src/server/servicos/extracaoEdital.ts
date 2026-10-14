import { novoId, transacao } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import type { Edital } from '../dominio/entidades.js'
import type { CampoEditalExtraido, ResultadoExtracaoEdital, ValorCampoEditalExtraido } from '../chat/ollama.js'

// Grava só os campos ainda vazios, com a evidência literal do documento.
export function salvarCamposExtraidos(edital: Edital, extracao: ResultadoExtracaoEdital): CampoEditalExtraido[] {
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

// Remove do texto o conteúdo de leituras anteriores de URL, para não duplicar ao reler.
export function semConteudoWebAnterior(texto: string): string {
  return texto
    .replace(/(?:^|\n\n)\[Fonte URL:[^\]]+\]\n[\s\S]*?(?=\n\n\[(?:Página\s+\d+|Fonte URL:)[^\]]*\]|$)/g, '')
    .trim()
}
