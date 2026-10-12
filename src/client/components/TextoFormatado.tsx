import type { ReactNode } from 'react'

function formatarLinha(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g)
  return partes.map((parte, indice) => {
    if ((parte.startsWith('**') && parte.endsWith('**')) || (parte.startsWith('__') && parte.endsWith('__'))) {
      return <strong key={indice}>{parte.slice(2, -2)}</strong>
    }
    if ((parte.startsWith('*') && parte.endsWith('*')) || (parte.startsWith('_') && parte.endsWith('_'))) {
      return <em key={indice}>{parte.slice(1, -1)}</em>
    }
    if (parte.startsWith('`') && parte.endsWith('`')) {
      return <code key={indice}>{parte.slice(1, -1)}</code>
    }
    return parte
  })
}

function ehMarcadorLista(linha: string): boolean {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(linha)
}

export function TextoFormatado({ texto }: { texto: string }) {
  const blocos = texto.trim().split(/\n\s*\n/)
  return (
    <div className="texto-formatado">
      {blocos.map((bloco, indiceBloco) => {
        const linhas = bloco.split('\n')
        if (linhas.every(ehMarcadorLista)) {
          const numerada = /^\s*\d+[.)]\s+/.test(linhas[0])
          const Lista = numerada ? 'ol' : 'ul'
          return (
            <Lista key={indiceBloco}>
              {linhas.map((linha, indiceLinha) => (
                <li key={indiceLinha}>{formatarLinha(linha.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''))}</li>
              ))}
            </Lista>
          )
        }

        if (/^#{1,3}\s+/.test(linhas[0])) {
          const nivel = linhas[0].match(/^#+/)![0].length
          const titulo = formatarLinha(linhas[0].replace(/^#{1,3}\s+/, ''))
          const Tag = `h${nivel + 2}` as 'h3' | 'h4' | 'h5'
          return (
            <div key={indiceBloco}>
              <Tag>{titulo}</Tag>
              {linhas.slice(1).map((linha, indiceLinha) => (
                <span key={indiceLinha}>
                  {indiceLinha > 0 && <br />}
                  {formatarLinha(linha)}
                </span>
              ))}
            </div>
          )
        }

        return (
          <p key={indiceBloco}>
            {linhas.map((linha, indiceLinha) => (
              <span key={indiceLinha}>
                {indiceLinha > 0 && <br />}
                {formatarLinha(linha)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
