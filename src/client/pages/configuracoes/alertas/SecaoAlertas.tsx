import { useEffect, useState } from 'react'
import {
  CATALOGO_ALERTAS,
  ErroParametroAlerta,
  GRUPOS_ALERTA,
  normalizarDestinatarios,
  normalizarParametros,
  TIPOS_NOTIFICACAO,
} from '../../../../shared/catalogoAlertas'
import type { AlertasResposta, ConfigAlerta, TipoNotificacao } from '../../../../shared/tipos/alertas'
import { alertas } from '../../../api/alertas'
import { mensagemDeErro } from '../../../api/cliente'
import { HistoricoEnvios } from './HistoricoEnvios'
import { LinhaAlerta } from './LinhaAlerta'

type PorTipo = Partial<Record<TipoNotificacao, ConfigAlerta>>

const porTipo = (lista: ConfigAlerta[]): PorTipo => Object.fromEntries(lista.map((c) => [c.tipo, c]))

// Configuração no formato gravado pelo servidor; lança ErroParametroAlerta se algo for inválido.
function normalizar(config: ConfigAlerta): ConfigAlerta {
  return {
    tipo: config.tipo,
    ativo: config.ativo,
    destinatarios: normalizarDestinatarios(config.destinatarios),
    parametros: normalizarParametros(config.tipo, config.parametros),
  }
}

function erroDe(config: ConfigAlerta): string | null {
  try {
    normalizar(config)
    return null
  } catch (e) {
    return e instanceof ErroParametroAlerta ? e.message : 'Configuração inválida.'
  }
}

// Compara pelo valor normalizado: digitar "7" onde havia 7 não conta como alteração.
function iguais(a: ConfigAlerta, b: ConfigAlerta): boolean {
  try {
    return JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b))
  } catch {
    return false
  }
}

export function SecaoAlertas() {
  const [dados, setDados] = useState<AlertasResposta | null>(null)
  const [originais, setOriginais] = useState<PorTipo>({})
  const [rascunho, setRascunho] = useState<PorTipo>({})
  const [aberto, setAberto] = useState<TipoNotificacao | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    alertas
      .listar()
      .then((resposta) => {
        setDados(resposta)
        setOriginais(porTipo(resposta.configuracoes))
        setRascunho(porTipo(resposta.configuracoes))
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Não foi possível carregar os alertas.') }))
  }, [])

  const alterados = TIPOS_NOTIFICACAO.filter((t) => {
    const r = rascunho[t]
    const o = originais[t]
    return r && o && !iguais(r, o)
  })
  const comErro = alterados.filter((t) => erroDe(rascunho[t]!))

  function alterar(config: ConfigAlerta) {
    setRascunho((atual) => ({ ...atual, [config.tipo]: config }))
    setAviso(null)
  }

  function descartar() {
    setRascunho(originais)
    setAviso(null)
  }

  async function salvarTudo() {
    setSalvando(true)
    setAviso(null)
    try {
      const resposta = await alertas.salvar({ configuracoes: alterados.map((t) => normalizar(rascunho[t]!)) })
      setOriginais(porTipo(resposta.configuracoes))
      setRascunho(porTipo(resposta.configuracoes))
      setAviso({ tipo: 'sucesso', texto: alterados.length === 1 ? 'Alerta salvo.' : `${alterados.length} alertas salvos.` })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e, 'Erro ao salvar os alertas.') })
    } finally {
      setSalvando(false)
    }
  }

  if (!dados) {
    return aviso ? <p className="aviso aviso--erro" role="alert">{aviso.texto}</p> : <p>Carregando alertas…</p>
  }

  return (
    <div className="pilha">
      {aviso ? (
        <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      ) : null}

      <div className="card">
        {GRUPOS_ALERTA.map((grupo) => (
          <section key={grupo} className="alerta-grupo" aria-label={grupo}>
            <h3 className="alerta-grupo__rotulo">{grupo}</h3>
            <ul className="alerta-grupo__lista">
              {TIPOS_NOTIFICACAO.filter((t) => CATALOGO_ALERTAS[t].grupo === grupo && rascunho[t]).map((t) => (
                <LinhaAlerta
                  key={t}
                  config={rascunho[t]!}
                  aberto={aberto === t}
                  alterado={alterados.includes(t)}
                  erro={erroDe(rascunho[t]!)}
                  ultimoEnvio={dados.ultimos_envios[t]}
                  onAbrir={() => setAberto((atual) => (atual === t ? null : t))}
                  onChange={alterar}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {alterados.length ? (
        <div className="barra-salvar" role="region" aria-label="Alterações não salvas">
          <span>
            {alterados.length === 1 ? '1 alerta alterado' : `${alterados.length} alertas alterados`}
            {comErro.length ? <span className="campo__erro"> · corrija {comErro.join(', ')} para salvar</span> : null}
          </span>
          <div className="linha">
            <button type="button" className="btn btn--fantasma" onClick={descartar} disabled={salvando}>
              Descartar
            </button>
            <button type="button" className="btn btn--primario" onClick={salvarTudo} disabled={salvando || comErro.length > 0}>
              {salvando ? 'Salvando…' : 'Salvar tudo'}
            </button>
          </div>
        </div>
      ) : null}

      <HistoricoEnvios logs={dados.logs} />
    </div>
  )
}
