import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  children: ReactNode
  /** Botões do rodapé (o de fechar fica no cabeçalho). */
  rodape?: ReactNode
}

// Janela sobre a página, com o <dialog> nativo: Esc fecha, o foco fica preso dentro e o fundo escurece.
// Clicar no fundo também fecha.
export function Modal({ aberto, titulo, aoFechar, children, rodape }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (aberto && !el.open) el.showModal()
    if (!aberto && el.open) el.close()
  }, [aberto])

  return (
    <dialog
      ref={dialogo}
      className="modal"
      aria-labelledby="modal-titulo"
      // Esc dispara "cancel": quem decide fechar é a página (o estado `aberto`).
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
      // Clique no fundo: o alvo é o próprio <dialog>, fora da caixa de conteúdo.
      onMouseDown={(e) => {
        if (e.target === dialogo.current) aoFechar()
      }}
    >
      {aberto ? (
        <div className="modal__caixa">
          <div className="modal__cabecalho">
            <h2 id="modal-titulo">{titulo}</h2>
            <button type="button" className="btn btn--sm btn--fantasma menu-acoes__botao" aria-label="Fechar" onClick={aoFechar}>
              ✕
            </button>
          </div>
          <div className="modal__corpo">{children}</div>
          {rodape ? <div className="modal__rodape">{rodape}</div> : null}
        </div>
      ) : null}
    </dialog>
  )
}
