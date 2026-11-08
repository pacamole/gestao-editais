import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { manuaisLista, type ManualInfo } from './manuais/conteudoManuais'

export function ManuaisPage() {
  const [manualAtivoId, setManualAtivoId] = useState<ManualInfo['id']>('uso')

  const manualAtual = manuaisLista.find((m) => m.id === manualAtivoId) ?? manuaisLista[0]

  // Função para baixar o arquivo Markdown (.md) diretamente
  function baixarMarkdown() {
    const blob = new Blob([manualAtual.conteudo], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = manualAtual.nomeArquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Função para imprimir ou salvar em PDF usando o renderizador nativo do navegador
  function imprimirOuPdf() {
    window.print()
  }

  return (
    <section className="pagina-manuais">
      <style>{`
        @media print {
          /* Ao imprimir ou salvar como PDF, oculta o menu lateral, abas e botões */
          .app-menu,
          .app-menu__sair,
          .pagina-manuais__acoes,
          .abas,
          .pagina-cabecalho {
            display: none !important;
          }
          .app {
            display: block !important;
          }
          .app-conteudo {
            padding: 0 !important;
            margin: 0 !important;
          }
          .pagina-manuais__conteudo {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }

        .pagina-manuais__cabecalho {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--esp-4);
          margin-bottom: var(--esp-5);
        }

        .pagina-manuais__acoes {
          display: flex;
          align-items: center;
          gap: var(--esp-3);
          flex-wrap: wrap;
        }

        .pagina-manuais__conteudo {
          margin-top: var(--esp-6);
          padding: var(--esp-8);
          background: var(--cor-superficie);
          border: 1px solid var(--cor-linha);
          border-radius: var(--raio-3);
          line-height: 1.7;
          color: var(--cor-texto);
        }

        .pagina-manuais__conteudo h1 {
          font-family: var(--fonte-titulo);
          font-size: var(--texto-2xl);
          margin-top: 0;
          margin-bottom: var(--esp-3);
          color: var(--cor-primaria);
        }

        .pagina-manuais__conteudo h2 {
          font-family: var(--fonte-titulo);
          font-size: var(--texto-xl);
          margin-top: var(--esp-6);
          margin-bottom: var(--esp-3);
          padding-bottom: var(--esp-2);
          border-bottom: 1px solid var(--cor-linha);
          color: var(--cor-texto);
        }

        .pagina-manuais__conteudo h3 {
          font-size: var(--texto-lg);
          margin-top: var(--esp-5);
          margin-bottom: var(--esp-2);
          color: var(--cor-texto);
        }

        .pagina-manuais__conteudo p {
          margin-bottom: var(--esp-4);
        }

        .pagina-manuais__conteudo ul,
        .pagina-manuais__conteudo ol {
          margin-bottom: var(--esp-4);
          padding-left: var(--esp-6);
        }

        .pagina-manuais__conteudo li {
          margin-bottom: var(--esp-2);
        }

        .pagina-manuais__conteudo table {
          width: 100%;
          border-collapse: collapse;
          margin: var(--esp-5) 0;
          font-size: var(--texto-sm);
        }

        .pagina-manuais__conteudo th,
        .pagina-manuais__conteudo td {
          padding: var(--esp-3) var(--esp-4);
          border: 1px solid var(--cor-linha);
          text-align: left;
          vertical-align: top;
        }

        .pagina-manuais__conteudo th {
          background: var(--cor-superficie-2);
          font-weight: 600;
        }

        .pagina-manuais__conteudo blockquote {
          margin: var(--esp-4) 0;
          padding: var(--esp-3) var(--esp-4);
          background: var(--cor-superficie-2);
          border-left: 4px solid var(--cor-primaria);
          border-radius: 0 var(--raio-2) var(--raio-2) 0;
          color: var(--cor-texto-2);
        }

        .pagina-manuais__conteudo pre {
          padding: var(--esp-4);
          background: var(--cor-menu);
          color: var(--cor-menu-texto);
          border-radius: var(--raio-2);
          overflow-x: auto;
          font-family: var(--fonte-mono);
          font-size: var(--texto-sm);
          margin: var(--esp-4) 0;
        }

        .pagina-manuais__conteudo code {
          font-family: var(--fonte-mono);
          font-size: 0.9em;
          padding: 2px 5px;
          background: var(--cor-superficie-2);
          border: 1px solid var(--cor-linha);
          border-radius: var(--raio-1);
        }

        .pagina-manuais__conteudo pre code {
          background: none;
          border: none;
          padding: 0;
          color: inherit;
        }
      `}</style>

      <header className="pagina-manuais__cabecalho">
        <div>
          <h1 style={{ fontFamily: 'var(--fonte-titulo)', fontSize: 'var(--texto-3xl)', margin: 0 }}>
            Manuais do Sistema
          </h1>
          <p style={{ color: 'var(--cor-texto-2)', margin: 'var(--esp-1) 0 0' }}>
            Documentação técnica e operacional para a equipe e administradores da I9+.
          </p>
        </div>

        <div className="pagina-manuais__acoes">
          <button
            type="button"
            onClick={baixarMarkdown}
            className="btn btn--fantasma"
            title={`Baixar ${manualAtual.nomeArquivo} em formato Markdown puro`}
          >
            📥 Baixar Markdown (.md)
          </button>
          <button
            type="button"
            onClick={imprimirOuPdf}
            className="btn btn--primario"
            title="Abre o assistente de impressão ou salvamento em PDF"
          >
            🖨️ Salvar em PDF / Imprimir
          </button>
        </div>
      </header>

      {/* Navegação entre os 3 manuais atribuídos */}
      <nav className="abas" aria-label="Seleção de manual">
        {manuaisLista.map((manual) => {
          const selecionado = manual.id === manualAtivoId
          return (
            <button
              key={manual.id}
              type="button"
              className="aba"
              aria-selected={selecionado}
              onClick={() => setManualAtivoId(manual.id)}
            >
              {manual.titulo}
            </button>
          )
        })}
      </nav>

      {/* Conteúdo formatado do manual ativo */}
      <article className="pagina-manuais__conteudo">
        <Markdown remarkPlugins={[remarkGfm]}>
          {manualAtual.conteudo}
        </Markdown>
      </article>
    </section>
  )
}
