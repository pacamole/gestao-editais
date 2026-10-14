type Props = {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  onIrPara: (pagina: number) => void
}

// Rodapé de paginação da lista de editais.
export function Paginacao({ pagina, limite, total, totalPaginas, onIrPara }: Props) {
  const inicio = (pagina - 1) * limite + 1
  const fim = Math.min(pagina * limite, total)

  return (
    <div className="paginacao">
      <span>
        Mostrando {inicio}–{fim} de {total} editais
      </span>
      <div className="linha">
        <button className="btn btn--sm" disabled={pagina <= 1} onClick={() => onIrPara(Math.max(1, pagina - 1))}>
          ← Anterior
        </button>
        <span className="discreto" style={{ alignSelf: 'center' }}>
          Página {pagina} de {totalPaginas || 1}
        </span>
        <button
          className="btn btn--sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onIrPara(Math.min(totalPaginas, pagina + 1))}
        >
          Próxima →
        </button>
      </div>
    </div>
  )
}
