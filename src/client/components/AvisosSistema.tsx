import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { Pendencia } from '../../shared/tipos/pendencias'
import { pendencias as apiPendencias } from '../api/pendencias'

// O que falta configurar (perfil, e-mail, destinatários), no topo de todas as páginas.
// Recarrega a cada troca de página: salvar o perfil e voltar já tira o aviso.
export function AvisosSistema() {
  const { pathname } = useLocation()
  const [lista, setLista] = useState<Pendencia[]>([])

  useEffect(() => {
    apiPendencias
      .obter()
      .then((r) => setLista(r.pendencias))
      .catch(() => setLista([]))
  }, [pathname])

  // Na própria página que resolve a pendência, o aviso só atrapalharia.
  const visiveis = lista.filter((p) => p.link !== pathname)
  if (!visiveis.length) return null

  return (
    <div className="pilha" style={{ marginBottom: 'var(--esp-6)' }}>
      {visiveis.map((p) => (
        <div key={p.id} className="aviso aviso--atencao linha linha--entre" role="status">
          <span>{p.texto}</span>
          <Link to={p.link} className="btn btn--sm">{p.acao}</Link>
        </div>
      ))}
    </div>
  )
}
