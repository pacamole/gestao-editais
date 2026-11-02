import { useEffect, useRef, useState } from 'react'

export type AcaoMenu = {
  rotulo: string
  aoClicar: () => void
  perigo?: boolean
  desabilitada?: boolean
}

const LARGURA_MENU = 180

// Botão "⋮" que abre a lista de ações de uma linha. O menu usa posição fixa para não ser cortado
// por contêineres com rolagem (como as tabelas dentro dos cartões).
export function MenuAcoes({ acoes, rotulo = 'Ações' }: { acoes: AcaoMenu[]; rotulo?: string }) {
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const aberto = posicao !== null

  function alternar() {
    if (aberto) return setPosicao(null)
    const caixa = botao.current!.getBoundingClientRect()
    setPosicao({ top: caixa.bottom + 4, left: Math.max(8, caixa.right - LARGURA_MENU) })
  }

  // Fecha ao clicar fora, apertar Esc, rolar a página ou redimensionar a janela.
  useEffect(() => {
    if (!aberto) return
    const fechar = () => setPosicao(null)
    const cliqueFora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (!menu.current?.contains(alvo) && !botao.current?.contains(alvo)) fechar()
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fechar()
        botao.current?.focus()
      }
    }
    document.addEventListener('mousedown', cliqueFora)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('mousedown', cliqueFora)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="btn btn--sm btn--fantasma menu-acoes__botao"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={alternar}
      >
        ⋮
      </button>
      {posicao ? (
        <ul ref={menu} className="menu-acoes" role="menu" style={{ top: posicao.top, left: posicao.left, width: LARGURA_MENU }}>
          {acoes.map((acao) => (
            <li key={acao.rotulo} role="none">
              <button
                type="button"
                role="menuitem"
                className={`menu-acoes__item${acao.perigo ? ' menu-acoes__item--perigo' : ''}`}
                disabled={acao.desabilitada}
                onClick={() => {
                  setPosicao(null)
                  acao.aoClicar()
                }}
              >
                {acao.rotulo}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
