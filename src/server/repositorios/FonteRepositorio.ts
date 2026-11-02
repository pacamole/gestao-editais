import type { Fonte } from '../dominio/entidades.js'
import { Repositorio } from './repositorio.js'

// Fonte excluída que tinha editais fica no banco (marcada em `removida_em`) para os editais seguirem com a origem;
// some de todas as listas. `buscarPorId` ainda a encontra.
const VIGENTE = 'removida_em IS NULL'
const MONITORADA = "tipo IN ('SCRAPER', 'RSS')"

export class FonteRepositorio extends Repositorio<Fonte, string, 'id' | 'ativo'> {
  protected readonly tabela = 'fonte'
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly ordemPadrao = 'nome'

  override listar(): Fonte[] {
    return this.consultar(`SELECT * FROM fonte WHERE ${VIGENTE} ORDER BY nome`)
  }

  listarAtivas(): Fonte[] {
    return this.consultar(`SELECT * FROM fonte WHERE ativo = 1 AND ${VIGENTE} ORDER BY nome`)
  }

  /** Fontes que o sistema visita sozinho (sem as internas de upload, link e cadastro). */
  listarMonitoradas(): Fonte[] {
    return this.consultar(`SELECT * FROM fonte WHERE ${MONITORADA} AND ${VIGENTE} ORDER BY nome`)
  }

  listarMonitoradasAtivas(): Fonte[] {
    return this.consultar(`SELECT * FROM fonte WHERE ${MONITORADA} AND ativo = 1 AND ${VIGENTE} ORDER BY nome`)
  }

  /** Fontes (inclusive excluídas e internas) que têm ao menos um edital: as opções do filtro da lista. */
  listarComEditais(): Fonte[] {
    return this.consultar('SELECT * FROM fonte f WHERE EXISTS (SELECT 1 FROM edital e WHERE e.fonte_id = f.id) ORDER BY nome')
  }

  buscarPorIntegracao(codigo: string): Fonte | undefined {
    return this.consultarUm(`SELECT * FROM fonte WHERE integracao = ? AND ${VIGENTE}`, codigo)
  }

  buscarPorNome(nome: string): Fonte | undefined {
    return this.consultarUm(`SELECT * FROM fonte WHERE nome = ? AND ${VIGENTE}`, nome)
  }

  contarEditais(fonteId: string): number {
    return this.escalar('SELECT COUNT(*) FROM edital WHERE fonte_id = ?', fonteId)
  }
}
