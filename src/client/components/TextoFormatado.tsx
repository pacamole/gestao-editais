import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Títulos da resposta ficam abaixo do título do card (h2) e do rótulo da mensagem.
const componentes: Components = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
  h4: ({ children }) => <h6>{children}</h6>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Tabelas largas rolam dentro da mensagem em vez de estourar o chat.
  table: ({ children }) => (
    <div className="texto-formatado__tabela">
      <table>{children}</table>
    </div>
  ),
}

// Markdown (GFM) das respostas da IA. HTML cru no texto é ignorado, não injetado.
export function TextoFormatado({ texto }: { texto: string }) {
  return (
    <div className="texto-formatado">
      <Markdown remarkPlugins={[remarkGfm]} components={componentes}>
        {texto}
      </Markdown>
    </div>
  )
}
