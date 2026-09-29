import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export function ErroPage() {
  const erro = useRouteError()
  const naoEncontrada = !erro || (isRouteErrorResponse(erro) && erro.status === 404)

  return (
    <section>
      <h1>{naoEncontrada ? 'Página não encontrada' : 'Algo deu errado'}</h1>
      <Link to="/">Voltar ao dashboard</Link>
    </section>
  )
}
