import { MODALIDADES } from '../../../shared/rotulos'
import type { FonteComExecucoes } from '../../../shared/tipos/fontes'
import type { PropsSecao } from './tipos'

// Cadastro manual, bloco 1: dados gerais.
export function SecaoDadosBasicos({ valores, onAlterar, processando, fontes }: PropsSecao & { fontes: FonteComExecucoes[] }) {
  return (
    <div className="pilha">
      <h3>1. Dados Básicos do Edital</h3>
      <div className="grade-2">
        <div className="campo">
          <label htmlFor="man-titulo">Título do Edital *</label>
          <input
            id="man-titulo"
            type="text"
            className="input"
            placeholder="Ex: Chamada Pública FINEP Inovação e Transição Energética"
            value={valores.titulo}
            onChange={(e) => onAlterar({ titulo: e.target.value })}
            disabled={processando}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="man-fonte">Fonte de Origem</label>
          <select
            id="man-fonte"
            className="select"
            value={valores.fonteId}
            onChange={(e) => onAlterar({ fonteId: e.target.value })}
            disabled={processando}
          >
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="man-orgao">Órgão Financiador</label>
          <input
            id="man-orgao"
            type="text"
            className="input"
            placeholder="Ex: FINEP, CNPq, Copel"
            value={valores.orgaoFinanciador}
            onChange={(e) => onAlterar({ orgaoFinanciador: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo">
          <label htmlFor="man-numero">Número da Chamada / Edital</label>
          <input
            id="man-numero"
            type="text"
            className="input"
            placeholder="Ex: 01/2026"
            value={valores.numeroEdital}
            onChange={(e) => onAlterar({ numeroEdital: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="campo">
          <label htmlFor="man-modalidade">Modalidade</label>
          <select
            id="man-modalidade"
            className="select"
            value={valores.modalidade}
            onChange={(e) => onAlterar({ modalidade: e.target.value })}
            disabled={processando}
          >
            {Object.entries(MODALIDADES).map(([k, rot]) => (
              <option key={k} value={k}>
                {rot}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="man-abrangencia">Abrangência Geográfica</label>
          <input
            id="man-abrangencia"
            type="text"
            className="input"
            placeholder="Ex: Nacional, Paraná, Sul"
            value={valores.abrangencia}
            onChange={(e) => onAlterar({ abrangencia: e.target.value })}
            disabled={processando}
          />
        </div>
      </div>
    </div>
  )
}
