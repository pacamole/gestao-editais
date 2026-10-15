import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import type { UsuarioLogado } from '../../shared/tipos/auth'
import { auth } from '../api/auth'
import { AppLayout } from '../layouts/AppLayout'

// Só mostra o app com sessão válida; sem sessão, manda para o login.
export function RotaProtegida() {
  // undefined = ainda verificando; null = sem sessão.
  const [usuario, setUsuario] = useState<UsuarioLogado | null | undefined>(undefined)

  useEffect(() => {
    auth
      .usuarioLogado()
      .then(setUsuario)
      .catch(() => setUsuario(null))
  }, [])

  if (usuario === undefined) {
    return <p>Verificando sessão...</p>
  }

  return usuario ? <AppLayout usuario={usuario} /> : <Navigate to="/login" replace />
}
