import type { PropsSecao, ValoresManual } from './tipos'

const PORTES = ['MEI', 'ME', 'EPP', 'MEDIA', 'GRANDE']

type ChaveTexto = 'cnaesAceitos' | 'areasTematicas' | 'publicoAlvo' | 'tempoMinimoMeses' | 'certidoesExigidas'
type CampoTexto = { id: string; rotulo: string; placeholder: string; chave: ChaveTexto; tipo?: 'number' }

const CAMPOS: CampoTexto[] = [
  { id: 'man-cnaes', rotulo: 'CNAEs Aceitos (separados por vírgula)', placeholder: 'Ex: 27.22-8, 27.21-0', chave: 'cnaesAceitos' },
  { id: 'man-areas', rotulo: 'Áreas Temáticas', placeholder: 'Ex: ESG, Baterias elétricas, Energia', chave: 'areasTematicas' },
  { id: 'man-publico', rotulo: 'Público-Alvo', placeholder: 'Ex: Empresas de tecnologia, indústrias', chave: 'publicoAlvo' },
  { id: 'man-tempo', rotulo: 'Tempo mínimo de fundação (meses)', placeholder: 'Ex: 12', chave: 'tempoMinimoMeses', tipo: 'number' },
  { id: 'man-certidoes', rotulo: 'Certidões Exigidas', placeholder: 'Ex: CND Federal, FGTS, CNDT', chave: 'certidoesExigidas' },
]

// Cadastro manual, bloco 4: requisitos e elegibilidade.
export function SecaoRequisitos({ valores, onAlterar, processando }: PropsSecao) {
  function alternarPorte(porte: string) {
    const atuais = valores.portesAceitos
    onAlterar({ portesAceitos: atuais.includes(porte) ? atuais.filter((p) => p !== porte) : [...atuais, porte] })
  }

  return (
    <div className="pilha">
      <h3>4. Requisitos e Elegibilidade</h3>
      <div className="grade-2">
        <div className="campo">
          <label>Portes de Empresa Aceitos</label>
          <div className="linha" style={{ gap: 'var(--esp-3)' }}>
            {PORTES.map((p) => (
              <label key={p} className="checkbox">
                <input
                  type="checkbox"
                  checked={valores.portesAceitos.includes(p)}
                  onChange={() => alternarPorte(p)}
                  disabled={processando}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        {CAMPOS.map((c) => (
          <div key={c.id} className="campo">
            <label htmlFor={c.id}>{c.rotulo}</label>
            <input
              id={c.id}
              type={c.tipo ?? 'text'}
              className="input"
              placeholder={c.placeholder}
              value={valores[c.chave]}
              onChange={(e) => onAlterar({ [c.chave]: e.target.value } as Pick<ValoresManual, ChaveTexto>)}
              disabled={processando}
            />
          </div>
        ))}
      </div>

      <div className="linha" style={{ gap: 'var(--esp-6)', marginTop: 'var(--esp-2)' }}>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={valores.exigeIct}
            onChange={(e) => onAlterar({ exigeIct: e.target.checked })}
            disabled={processando}
          />
          Exige parceria com ICT ou Universidade
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={valores.submissaoMultipla}
            onChange={(e) => onAlterar({ submissaoMultipla: e.target.checked })}
            disabled={processando}
          />
          Permite submissão múltipla de propostas
        </label>
      </div>
    </div>
  )
}
