import { Router } from 'express'
import type { ErroApi } from '../../shared/api.js'
import { emailValido, TIPOS_NOTIFICACAO } from '../../shared/catalogoAlertas.js'
import type { ListaDestinatariosResposta, RemoverDestinatarioResposta } from '../../shared/tipos/destinatarios.js'
import type { TipoNotificacao } from '../dominio/entidades.js'
import { transacao } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'

export const rotasDestinatarios = Router()

function listar(): ListaDestinatariosResposta {
  const alertas = TIPOS_NOTIFICACAO.map((tipo) => repositorios.configAlerta.obter(tipo))
  const destinatarios = repositorios.destinatario.emails().map((email) => ({
    email,
    usuario: Boolean(repositorios.usuario.buscarPorEmail(email)),
    // Alerta sem escolha recebe a lista toda.
    alertas: alertas
      .filter((a) => !a.destinatarios.length || a.destinatarios.some((e) => e.toLowerCase() === email.toLowerCase()))
      .map((a) => a.tipo),
  }))
  return { destinatarios }
}

rotasDestinatarios.get('/destinatarios', (_req, res) => {
  res.json(listar())
})

rotasDestinatarios.post('/destinatarios', (req, res) => {
  const email = String(req.body?.email ?? '').trim()
  if (!emailValido(email)) return res.status(400).json({ erro: 'E-mail inválido.' } satisfies ErroApi)
  if (!repositorios.destinatario.adicionar(email)) {
    return res.status(409).json({ erro: 'Este e-mail já está na lista.' } satisfies ErroApi)
  }
  res.status(201).json(listar())
})

// Remove da lista e dos alertas que o tinham escolhido.
// Alerta que ficaria sem ninguém é desativado: lista vazia significaria "todos da lista".
rotasDestinatarios.delete('/destinatarios/:email', (req, res) => {
  const email = req.params.email.toLowerCase()
  const desativados: TipoNotificacao[] = []
  const removido = transacao(() => {
    if (!repositorios.destinatario.excluir(email)) return false
    for (const tipo of TIPOS_NOTIFICACAO) {
      const config = repositorios.configAlerta.obter(tipo)
      const restantes = config.destinatarios.filter((e) => e.toLowerCase() !== email)
      if (restantes.length === config.destinatarios.length) continue
      if (restantes.length) {
        repositorios.configAlerta.atualizar(tipo, { destinatarios: restantes })
      } else {
        repositorios.configAlerta.atualizar(tipo, { destinatarios: [], ativo: false })
        desativados.push(tipo)
      }
    }
    return true
  })
  if (!removido) return res.status(404).json({ erro: 'E-mail não está na lista.' } satisfies ErroApi)
  res.json({ ...listar(), alertas_desativados: desativados } satisfies RemoverDestinatarioResposta)
})
