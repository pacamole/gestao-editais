import { Router } from 'express'
import { transacao } from '../db/index.js'
import { repositorios } from '../repositorios/index.js'
import { reavaliarEditaisAtivos } from '../servicos/avaliacao.js'
import { normalizarLista } from '../util/listas.js'
import type { PerfilResposta, SalvarPerfilResposta } from '../../shared/tipos/perfil.js'

export const rotasPerfil = Router()

rotasPerfil.get('/perfil-empresa', (_req, res) => {
  res.json({ perfil: repositorios.perfilEmpresa.obter() ?? null } satisfies PerfilResposta)
})

rotasPerfil.post('/perfil-empresa', (req, res) => {
  const payload = req.body ?? {}
  const perfil = {
    id: 1,
    razao_social: String(payload.razao_social ?? '').trim() || 'I9+ Consultoria e Inovação',
    nome_fantasia: payload.nome_fantasia ? String(payload.nome_fantasia).trim() : null,
    cnpj: String(payload.cnpj ?? '').trim() || '00.000.000/0000-00',
    cnae_principal: String(payload.cnae_principal ?? '').trim() || '0000-0/00',
    cnaes_secundarios: normalizarLista(payload.cnaes_secundarios),
    porte: String(payload.porte ?? 'ME'),
    natureza_juridica: String(payload.natureza_juridica ?? '').trim() || 'Sociedade Empresária Limitada',
    data_fundacao: String(payload.data_fundacao ?? '').trim() || '2020-01-01',
    faturamento_anual: payload.faturamento_anual == null || payload.faturamento_anual === '' ? null : Number(payload.faturamento_anual),
    uf: String(payload.uf ?? 'PR').trim().toUpperCase() || 'PR',
    municipio: String(payload.municipio ?? '').trim() || 'Curitiba',
    areas_atuacao: normalizarLista(payload.areas_atuacao),
    palavras_chave: normalizarLista(payload.palavras_chave),
    possui_ict_parceira: Boolean(payload.possui_ict_parceira),
    certidoes_disponiveis: normalizarLista(payload.certidoes_disponiveis),
    capacidade_contrapartida_percentual: payload.capacidade_contrapartida_percentual == null || payload.capacidade_contrapartida_percentual === '' ? null : Number(payload.capacidade_contrapartida_percentual),
    valor_minimo_interesse: payload.valor_minimo_interesse == null || payload.valor_minimo_interesse === '' ? null : Number(payload.valor_minimo_interesse),
    prazo_minimo_preparo_dias: payload.prazo_minimo_preparo_dias == null || payload.prazo_minimo_preparo_dias === '' ? null : Number(payload.prazo_minimo_preparo_dias),
  }

  const existente = repositorios.perfilEmpresa.obter()
  const reavaliar = Boolean(payload.reavaliar)
  let editaisReavaliados = 0
  const salvo = transacao(() => {
    const perfilSalvo = existente ? repositorios.perfilEmpresa.salvar(perfil) : repositorios.perfilEmpresa.inserir(perfil)
    repositorios.mensagem.excluirDeTodasConversas()
    if (reavaliar && perfilSalvo) {
      editaisReavaliados = reavaliarEditaisAtivos(perfilSalvo.atualizado_em)
    }
    return perfilSalvo
  })

  res.json({
    ok: true,
    perfil: salvo!,
    reavaliacaoSolicitada: reavaliar,
    editaisReavaliados,
    chatsLimpos: true,
  } satisfies SalvarPerfilResposta)
})
