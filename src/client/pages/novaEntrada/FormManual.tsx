import type { FormEvent } from 'react'
import type { CriarManualEntrada } from '../../../shared/tipos/editais'
import { editais } from '../../api/editais'
import { SecaoCronograma } from './SecaoCronograma'
import { SecaoDadosBasicos } from './SecaoDadosBasicos'
import { SecaoRequisitos } from './SecaoRequisitos'
import { SecaoValores } from './SecaoValores'
import type { PropsFormulario, ValoresManual } from './tipos'

const textoOuNulo = (v: string) => v.trim() || null
const numeroOuNulo = (v: string) => (v ? Number(v) : null)

// Converte os valores digitados no corpo da requisição.
function montarPayload(v: ValoresManual): Omit<CriarManualEntrada, 'tipo'> {
  return {
    titulo: v.titulo.trim(),
    orgao_financiador: textoOuNulo(v.orgaoFinanciador),
    numero_edital: textoOuNulo(v.numeroEdital),
    modalidade: v.modalidade,
    fonte_id: v.fonteId,
    data_publicacao: v.dataPublicacao || null,
    prazo_inscricao: v.prazoInscricao || null,
    data_resultado_prevista: v.dataResultado || null,
    valor_total_disponivel: numeroOuNulo(v.valorTotal),
    valor_maximo_por_projeto: numeroOuNulo(v.valorMaximo),
    exige_contrapartida: v.exigeContrapartida,
    percentual_contrapartida: numeroOuNulo(v.percentualContrapartida),
    publico_alvo: textoOuNulo(v.publicoAlvo),
    cnaes_aceitos: textoOuNulo(v.cnaesAceitos),
    portes_aceitos: v.portesAceitos.length ? v.portesAceitos : null,
    natureza_juridica_aceita: textoOuNulo(v.naturezaJuridica),
    abrangencia_geografica: textoOuNulo(v.abrangencia),
    exige_ict_parceira: v.exigeIct,
    tempo_minimo_fundacao_meses: numeroOuNulo(v.tempoMinimoMeses),
    faturamento_minimo: numeroOuNulo(v.faturamentoMinimo),
    faturamento_maximo: numeroOuNulo(v.faturamentoMaximo),
    certidoes_exigidas: textoOuNulo(v.certidoesExigidas),
    areas_tematicas: textoOuNulo(v.areasTematicas),
    permite_submissao_multipla: v.submissaoMultipla,
    resumo_executivo: textoOuNulo(v.resumoExecutivo),
  }
}

// Aba 3: cadastro manual dos campos, dividido em quatro blocos mais o resumo.
export function FormManual({ fontes, valores, onAlterar, processando, onErro, processar }: PropsFormulario<ValoresManual>) {
  function submeter(e: FormEvent) {
    e.preventDefault()
    if (!valores.titulo.trim()) {
      onErro('O título do edital é obrigatório.')
      return
    }
    processar({
      mensagemInicial: 'Gravando edital e calculando critérios de elegibilidade...',
      mensagemSucesso: 'Edital cadastrado com sucesso! Redirecionando para o detalhe...',
      erroPadrao: 'Falha ao salvar edital.',
      executar: () => editais.criarManual(montarPayload(valores)),
    })
  }

  const secao = { valores, onAlterar, processando }

  return (
    <form onSubmit={submeter} className="card__corpo">
      <div className="pilha pilha--lg">
        <SecaoDadosBasicos {...secao} fontes={fontes} />
        <SecaoCronograma {...secao} />
        <SecaoValores {...secao} />
        <SecaoRequisitos {...secao} />

        {/* Bloco 5: Resumo Executivo */}
        <div className="campo">
          <label htmlFor="man-resumo">Resumo Executivo do Edital</label>
          <textarea
            id="man-resumo"
            className="textarea"
            rows={4}
            placeholder="Síntese dos objetivos, critérios de concessão e obrigações da empresa..."
            value={valores.resumoExecutivo}
            onChange={(e) => onAlterar({ resumoExecutivo: e.target.value })}
            disabled={processando}
          />
        </div>

        <div className="card__rodape linha">
          <button type="submit" className="btn btn--primario" disabled={!valores.titulo.trim() || processando}>
            {processando ? 'Cadastrando edital...' : 'Cadastrar edital e ver análise →'}
          </button>
        </div>
      </div>
    </form>
  )
}
