import { transacao } from '../db/index.js'
import { ErroValidacao } from '../dominio/erros.js'
import type { Repositorios } from '../repositorios/index.js'
import { normalizarLista } from '../util/listas.js'
import type { Porte } from '../../shared/tipos/dominio.js'
import type { PerfilResposta, SalvarPerfilResposta } from '../../shared/tipos/perfil.js'

type RepositoriosPerfil = Pick<Repositorios, 'perfilEmpresa' | 'mensagem'>

const PORTES: readonly Porte[] = ['MEI', 'ME', 'EPP', 'MEDIA', 'GRANDE']

const numeroOuNulo = (valor: unknown): number | null => (valor == null || valor === '' ? null : Number(valor))

// Perfil da empresa, usado para avaliar a aderência dos editais.
export class PerfilServico {
  constructor(
    private readonly repos: RepositoriosPerfil,
    private readonly reavaliarEditais: () => number,
  ) {}

  obter(): PerfilResposta {
    return { perfil: this.repos.perfilEmpresa.obter() ?? null }
  }

  salvar(payload: Record<string, unknown>): SalvarPerfilResposta {
    const porte = String(payload.porte ?? 'ME') as Porte
    if (!PORTES.includes(porte)) throw new ErroValidacao('Porte inválido.')

    const perfil = {
      id: 1,
      razao_social: String(payload.razao_social ?? '').trim() || 'I9+ Consultoria e Inovação',
      nome_fantasia: payload.nome_fantasia ? String(payload.nome_fantasia).trim() : null,
      cnpj: String(payload.cnpj ?? '').trim() || '00.000.000/0000-00',
      cnae_principal: String(payload.cnae_principal ?? '').trim() || '0000-0/00',
      cnaes_secundarios: normalizarLista(payload.cnaes_secundarios),
      porte,
      natureza_juridica: String(payload.natureza_juridica ?? '').trim() || 'Sociedade Empresária Limitada',
      data_fundacao: String(payload.data_fundacao ?? '').trim() || '2020-01-01',
      faturamento_anual: numeroOuNulo(payload.faturamento_anual),
      uf: String(payload.uf ?? 'PR').trim().toUpperCase() || 'PR',
      municipio: String(payload.municipio ?? '').trim() || 'Curitiba',
      areas_atuacao: normalizarLista(payload.areas_atuacao),
      palavras_chave: normalizarLista(payload.palavras_chave),
      possui_ict_parceira: Boolean(payload.possui_ict_parceira),
      certidoes_disponiveis: normalizarLista(payload.certidoes_disponiveis),
      capacidade_contrapartida_percentual: numeroOuNulo(payload.capacidade_contrapartida_percentual),
      valor_minimo_interesse: numeroOuNulo(payload.valor_minimo_interesse),
      prazo_minimo_preparo_dias: numeroOuNulo(payload.prazo_minimo_preparo_dias),
    }

    const existente = this.repos.perfilEmpresa.obter()
    const reavaliar = Boolean(payload.reavaliar)
    let editaisReavaliados = 0
    const salvo = transacao(() => {
      const perfilSalvo = existente ? this.repos.perfilEmpresa.salvar(perfil) : this.repos.perfilEmpresa.inserir(perfil)
      // O perfil mudou: conversas antigas citam o perfil anterior.
      this.repos.mensagem.excluirDeTodasConversas()
      if (reavaliar && perfilSalvo) editaisReavaliados = this.reavaliarEditais()
      return perfilSalvo
    })

    return { ok: true, perfil: salvo!, reavaliacaoSolicitada: reavaliar, editaisReavaliados, chatsLimpos: true }
  }
}
