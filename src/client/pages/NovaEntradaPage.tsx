import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { FonteComExecucoes } from '../../shared/tipos/fontes'
import { mensagemDeErro } from '../api/cliente'
import { fontes as apiFontes } from '../api/fontes'
import { FormManual } from './novaEntrada/FormManual'
import { FormUpload } from './novaEntrada/FormUpload'
import { FormUrl } from './novaEntrada/FormUrl'
import {
  VALORES_MANUAL_INICIAIS,
  VALORES_UPLOAD_INICIAIS,
  VALORES_URL_INICIAIS,
  type Processar,
  type ValoresManual,
  type ValoresUpload,
  type ValoresUrl,
} from './novaEntrada/tipos'

type Aba = 'upload' | 'url' | 'manual'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'upload', rotulo: '1. Upload de PDF' },
  { id: 'url', rotulo: '2. Colar URL' },
  { id: 'manual', rotulo: '3. Cadastro manual' },
]

export function NovaEntradaPage() {
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('upload')
  const [fontes, setFontes] = useState<FonteComExecucoes[]>([])

  // Estado geral
  const [processando, setProcessando] = useState(false)
  const [mensagemStatus, setMensagemStatus] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Valores de cada aba (preservados ao alternar)
  const [upload, setUpload] = useState<ValoresUpload>(VALORES_UPLOAD_INICIAIS)
  const [url, setUrl] = useState<ValoresUrl>(VALORES_URL_INICIAIS)
  const [manual, setManual] = useState<ValoresManual>(VALORES_MANUAL_INICIAIS)

  // Carrega fontes e escolhe a fonte padrão de cada aba
  useEffect(() => {
    apiFontes
      .listar()
      .then((r) => {
        const lista = r.fontes || []
        setFontes(lista)
        const fUpload = lista.find((f) => f.tipo === 'UPLOAD_MANUAL' || f.nome.includes('Upload')) || lista[0]
        const fUrl = lista.find((f) => f.tipo === 'URL_MANUAL' || f.nome.includes('URL')) || lista[0]
        if (fUpload) setUpload((v) => ({ ...v, fonteId: fUpload.id }))
        if (fUrl) setUrl((v) => ({ ...v, fonteId: fUrl.id }))
        if (lista[0]) setManual((v) => ({ ...v, fonteId: lista[0].id }))
      })
      .catch(() => {})
  }, [])

  // Executa a criação com indicador de progresso e abre o detalhe do edital criado.
  const processar: Processar = async ({ mensagemInicial, mensagemSucesso, erroPadrao, executar }) => {
    try {
      setProcessando(true)
      setErro(null)
      setMensagemStatus(mensagemInicial)
      const resposta = await executar(setMensagemStatus)
      setMensagemStatus(mensagemSucesso)
      setTimeout(() => navigate(`/editais/${resposta.id}`), 500)
    } catch (err) {
      setErro(mensagemDeErro(err, erroPadrao))
      setProcessando(false)
      setMensagemStatus('')
    }
  }

  const comum = { fontes, processando, onErro: setErro, processar }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Nova entrada</h1>
          <p>
            P05 — Três formas de entrada: Upload de PDF (arrastar e soltar), Colagem de URL e Cadastro manual.
          </p>
        </div>
      </header>

      {erro && (
        <div className="aviso aviso--erro" role="alert" style={{ marginBottom: 'var(--esp-4)' }}>
          {erro}
        </div>
      )}

      {/* Indicador visual de processamento */}
      {processando && (
        <div
          className="aviso aviso--info"
          role="status"
          style={{
            marginBottom: 'var(--esp-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--esp-3)',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid var(--cor-primaria)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div>
            <strong>Processando edital...</strong> {mensagemStatus}
          </div>
        </div>
      )}

      <div className="card">
        <div className="abas" role="tablist">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              className="aba"
              role="tab"
              aria-selected={abaAtiva === aba.id}
              onClick={() => {
                setAbaAtiva(aba.id)
                setErro(null)
              }}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        {abaAtiva === 'upload' && (
          <FormUpload {...comum} valores={upload} onAlterar={(p) => setUpload((v) => ({ ...v, ...p }))} />
        )}
        {abaAtiva === 'url' && (
          <FormUrl {...comum} valores={url} onAlterar={(p) => setUrl((v) => ({ ...v, ...p }))} />
        )}
        {abaAtiva === 'manual' && (
          <FormManual {...comum} valores={manual} onAlterar={(p) => setManual((v) => ({ ...v, ...p }))} />
        )}
      </div>
    </section>
  )
}
