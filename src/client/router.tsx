import { createBrowserRouter } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { AlertasPage } from './pages/AlertasPage'
import { BasePage } from './pages/BasePage'
import { CriteriosPage } from './pages/CriteriosPage'
import { DashboardPage } from './pages/DashboardPage'
import { EditalDetalhePage } from './pages/EditalDetalhePage'
import { EditaisPage } from './pages/EditaisPage'
import { ErroPage } from './pages/ErroPage'
import { FontesPage } from './pages/FontesPage'
import { LoginPage } from './pages/LoginPage'
import { NovaEntradaPage } from './pages/NovaEntradaPage'
import { PerfilPage } from './pages/PerfilPage'

// Mapa de páginas (§5 da especificação).
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, // P01 — público
  {
    element: <AppLayout />,
    errorElement: <ErroPage />,
    children: [
      // Analista e Gestor
      { index: true, element: <DashboardPage /> }, // P02
      { path: 'editais', element: <EditaisPage /> }, // P03
      { path: 'editais/novo', element: <NovaEntradaPage /> }, // P05
      { path: 'editais/:id', element: <EditalDetalhePage /> }, // P04
      // Somente Gestor
      { path: 'perfil', element: <PerfilPage /> }, // P06
      { path: 'criterios', element: <CriteriosPage /> }, // P07
      { path: 'fontes', element: <FontesPage /> }, // P08
      { path: 'alertas', element: <AlertasPage /> }, // P09
      { path: 'base', element: <BasePage /> }, // compartilhamento da base
      { path: '*', element: <ErroPage /> },
    ],
  },
])
