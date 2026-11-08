import { db, novoId } from '../db/index.js'
import type { StatusElegibilidade } from '../../shared/tipos/dominio.js'
import type { AnaliseElegibilidade } from '../../shared/tipos/triagem.js'

type LinhaTriagem = {
  id: string
  edital_id: string
  status: StatusElegibilidade
  analise_json: string
  perfil_atualizado_em: string | null
  criado_em: string
}

export class TriagemElegibilidadeRepositorio {
  inserir(editalId: string, analise: AnaliseElegibilidade, perfilAtualizadoEm: string | null): void {
    db.prepare(`
      INSERT INTO triagem_elegibilidade
        (id, edital_id, status, analise_json, perfil_atualizado_em, criado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(novoId(), editalId, analise.status, JSON.stringify(analise), perfilAtualizadoEm, analise.criado_em)
  }

  ultimaDoEdital(editalId: string): AnaliseElegibilidade | null {
    const linha = db.prepare(`
      SELECT analise_json FROM triagem_elegibilidade
      WHERE edital_id = ? ORDER BY criado_em DESC LIMIT 1
    `).get(editalId) as Pick<LinhaTriagem, 'analise_json'> | undefined
    return linha ? JSON.parse(linha.analise_json) as AnaliseElegibilidade : null
  }

  ultimaCompativelComPerfil(editalId: string, perfilAtualizadoEm: string | null): StatusElegibilidade | null {
    if (!perfilAtualizadoEm) return null
    const linha = db.prepare(`
      SELECT status, perfil_atualizado_em FROM triagem_elegibilidade
      WHERE edital_id = ? ORDER BY criado_em DESC LIMIT 1
    `).get(editalId) as Pick<LinhaTriagem, 'status' | 'perfil_atualizado_em'> | undefined
    return linha?.perfil_atualizado_em === perfilAtualizadoEm ? linha.status : null
  }
}
