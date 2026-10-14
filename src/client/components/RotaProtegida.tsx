import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { auth } from '../api/auth'
import { AppLayout } from '../layouts/AppLayout'

// Só mostra o app com sessão válida; sem sessão, manda para o login.
export function RotaProtegida() {
  const [estado, setEstado] = useState<'carregando' | 'sim' | 'nao'>('carregando')

  useEffect(() => {
    auth
      .autenticado()
      .then((ok) => setEstado(ok ? 'sim' : 'nao'))
      .catch(() => setEstado('nao'))
  }, [])

  if (estado === 'carregando') {
    return <p>Verificando sessão...</p>
  }

  return estado === 'sim' ? <AppLayout /> : <Navigate to="/login" replace />
}
