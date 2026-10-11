import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MODALIDADES } from '../../shared/rotulos'

type FonteItem = {
  id: string
  nome: string
  tipo: string
}

export function NovaEntradaPage() {
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState<'upload' | 'url' | 'manual'>('upload')
  const [fontes, setFontes] = useState<FonteItem[]>([])

  // Estado geral
  const [processando, setProcessando] = useState(false)
  const [mensagemStatus, setMensagemStatus] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // 1. Estados da Aba Upload
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null)
  const [fonteUploadId, setFonteUploadId] = useState('')
  const [arrastando, setArrastando] = useState(false)

  // 2. Estados da Aba URL
  const [urlEdital, setUrlEdital] = useState('')
  const [fonteUrlId, setFonteUrlId] = useState('')

  // 3. Estados da Aba Manual
  const [fonteManualId, setFonteManualId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [orgaoFinanciador, setOrgaoFinanciador] = useState('')
  const [numeroEdital, setNumeroEdital] = useState('')
  const [modalidade, setModalidade] = useState('SUBVENCAO')
  const [dataPublicacao, setDataPublicacao] = useState('')
  const [prazoInscricao, setPrazoInscricao] = useState('')
  const [dataResultado, setDataResultado] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [valorMaximo, setValorMaximo] = useState('')
  const [exigeContrapartida, setExigeContrapartida] = useState(false)
  const [percentualContrapartida, setPercentualContrapartida] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('')
  const [cnaesAceitos, setCnaesAceitos] = useState('')
  const [portesAceitos, setPortesAceitos] = useState<string[]>(['ME', 'EPP'])
  const [naturezaJuridica, setNaturezaJuridica] = useState('')
  const [abrangencia, setAbrangencia] = useState('Nacional')
  const [exigeIct, setExigeIct] = useState(false)
  const [tempoMinimoMeses, setTempoMinimoMeses] = useState('')
  const [faturamentoMinimo, setFaturamentoMinimo] = useState('')
  const [faturamentoMaximo, setFaturamentoMaximo] = useState('')
  const [certidoesExigidas, setCertidoesExigidas] = useState('')
  const [areasTematicas, setAreasTematicas] = useState('ESG, Baterias elétricas, Energia sustentável')
  const [submissaoMultipla, setSubmissaoMultipla] = useState(false)
  const [resumoExecutivo, setResumoExecutivo] = useState('')

  // Carrega fontes ativas
  useEffect(() => {
    async function carregarFontes() {
      try {
        const resp = await fetch('/api/fontes')
        if (resp.ok) {
          const json = await resp.json()
          const lista: FonteItem[] = json.fontes || []
          setFontes(lista)

          const fUpload = lista.find((f) => f.tipo === 'UPLOAD_MANUAL' || f.nome.includes('Upload')) || lista[0]
          const fUrl = lista.find((f) => f.tipo === 'URL_MANUAL' || f.nome.includes('URL')) || lista[0]
          if (fUpload) setFonteUploadId(fUpload.id)
          if (fUrl) setFonteUrlId(fUrl.id)
          if (lista[0]) setFonteManualId(lista[0].id)
        }
      } catch {}
    }
    carregarFontes()
  }, [])

  // Validação e seleção de arquivo com limite de 20 MB
  const tratarArquivo = (file: File) => {
    setErro(null)
    const limiteBytes = 20 * 1024 * 1024 // 20 MB
    if (file.size > limiteBytes) {
      setArquivoPdf(null)
      setErro(
        `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB) ultrapassa o limite máximo permitido de 20 MB.`
      )
      return
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setArquivoPdf(null)
      setErro('Por favor, selecione um arquivo no formato PDF.')
      return
    }

    setArquivoPdf(file)
  }

  // Submissão 1: Upload de PDF (Arrastar e Soltar)
  async function submeterUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivoPdf) {
      setErro('Selecione ou arraste um arquivo PDF de até 20 MB.')
      return
    }

    try {
      setProcessando(true)
      setErro(null)
      setMensagemStatus('Lendo arquivo PDF e enviando para processamento...')

      // Converte o arquivo para Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64Content = result.split(',')[1] || ''
          resolve(base64Content)
        }
        reader.onerror = () => reject(new Error('Erro na leitura do arquivo local.'))
        reader.readAsDataURL(arquivoPdf)
      })

      setMensagemStatus('Extraindo informações do documento e cadastrando edital...')

      const resp = await fetch('/api/editais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'UPLOAD_PDF',
          nome_arquivo: arquivoPdf.name,
          arquivo_base64: base64,
          fonte_id: fonteUploadId,
        }),
      })

      const json = await resp.json()
      if (!resp.ok) throw new Error(json.erro || 'Erro ao processar arquivo PDF.')

      setMensagemStatus('Edital criado com sucesso! Redirecionando para o detalhe...')
      setTimeout(() => {
        navigate(`/editais/${json.id}`)
      }, 500)
    } catch (err: any) {
      setErro(err.message || 'Falha no processamento do arquivo.')
      setProcessando(false)
      setMensagemStatus('')
    }
  }

  // Submissão 2: Colar URL
  async function submeterUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!urlEdital.trim()) {
      setErro('Informe o endereço (URL) do edital.')
      return
    }

    if (!/^https?:\/\//i.test(urlEdital.trim())) {
      setErro('O endereço deve começar com http:// ou https://.')
      return
    }

    try {
      setProcessando(true)
      setErro(null)
      setMensagemStatus('Consultando endereço de origem e obtendo edital...')

      const resp = await fetch('/api/editais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'URL',
          url: urlEdital.trim(),
          fonte_id: fonteUrlId,
        }),
      })

      const json = await resp.json()
      if (!resp.ok) throw new Error(json.erro || 'Erro ao processar URL do edital.')

      setMensagemStatus('Edital criado com sucesso! Redirecionando para o detalhe...')
      setTimeout(() => {
        navigate(`/editais/${json.id}`)
      }, 500)
    } catch (err: any) {
      setErro(err.message || 'Falha ao processar URL.')
      setProcessando(false)
      setMensagemStatus('')
    }
  }

  // Submissão 3: Cadastro Manual dos Campos
  async function submeterManual(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setErro('O título do edital é obrigatório.')
      return
    }

    try {
      setProcessando(true)
      setErro(null)
      setMensagemStatus('Gravando edital e calculando critérios de elegibilidade...')

      const payload = {
        tipo: 'MANUAL',
        titulo: titulo.trim(),
        orgao_financiador: orgaoFinanciador.trim() || null,
        numero_edital: numeroEdital.trim() || null,
        modalidade,
        fonte_id: fonteManualId,
        data_publicacao: dataPublicacao || null,
        prazo_inscricao: prazoInscricao || null,
        data_resultado_prevista: dataResultado || null,
        valor_total_disponivel: valorTotal ? Number(valorTotal) : null,
        valor_maximo_por_projeto: valorMaximo ? Number(valorMaximo) : null,
        exige_contrapartida: exigeContrapartida,
        percentual_contrapartida: percentualContrapartida ? Number(percentualContrapartida) : null,
        publico_alvo: publicoAlvo.trim() || null,
        cnaes_aceitos: cnaesAceitos.trim() || null,
        portes_aceitos: portesAceitos.length ? portesAceitos : null,
        natureza_juridica_aceita: naturezaJuridica.trim() || null,
        abrangencia_geografica: abrangencia.trim() || null,
        exige_ict_parceira: exigeIct,
        tempo_minimo_fundacao_meses: tempoMinimoMeses ? Number(tempoMinimoMeses) : null,
        faturamento_minimo: faturamentoMinimo ? Number(faturamentoMinimo) : null,
        faturamento_maximo: faturamentoMaximo ? Number(faturamentoMaximo) : null,
        certidoes_exigidas: certidoesExigidas.trim() || null,
        areas_tematicas: areasTematicas.trim() || null,
        permite_submissao_multipla: submissaoMultipla,
        resumo_executivo: resumoExecutivo.trim() || null,
      }

      const resp = await fetch('/api/editais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await resp.json()
      if (!resp.ok) throw new Error(json.erro || 'Erro ao cadastrar edital manual.')

      setMensagemStatus('Edital cadastrado com sucesso! Redirecionando para o detalhe...')
      setTimeout(() => {
        navigate(`/editais/${json.id}`)
      }, 500)
    } catch (err: any) {
      setErro(err.message || 'Falha ao salvar edital.')
      setProcessando(false)
      setMensagemStatus('')
    }
  }

  const togglePorte = (porte: string) => {
    setPortesAceitos((prev) =>
      prev.includes(porte) ? prev.filter((p) => p !== porte) : [...prev, porte]
    )
  }

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

      {/* Indicador Visual de Processamento */}
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

      {/* Seletor de Abas (Role Tablist) */}
      <div className="card">
        <div className="abas" role="tablist">
          <button
            type="button"
            className="aba"
            role="tab"
            aria-selected={abaAtiva === 'upload'}
            onClick={() => {
              setAbaAtiva('upload')
              setErro(null)
            }}
          >
            1. Upload de PDF
          </button>
          <button
            type="button"
            className="aba"
            role="tab"
            aria-selected={abaAtiva === 'url'}
            onClick={() => {
              setAbaAtiva('url')
              setErro(null)
            }}
          >
            2. Colar URL
          </button>
          <button
            type="button"
            className="aba"
            role="tab"
            aria-selected={abaAtiva === 'manual'}
            onClick={() => {
              setAbaAtiva('manual')
              setErro(null)
            }}
          >
            3. Cadastro manual
          </button>
        </div>

        {/* ABA 1: Upload de PDF por arrastar e soltar (limite 20 MB) */}
        {abaAtiva === 'upload' && (
          <form onSubmit={submeterUpload} className="card__corpo">
            <div className="pilha">
              <div className="campo">
                <label htmlFor="fonte-upload">Fonte de origem</label>
                <select
                  id="fonte-upload"
                  className="select"
                  value={fonteUploadId}
                  onChange={(e) => setFonteUploadId(e.target.value)}
                  disabled={processando}
                >
                  {fontes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.tipo})
                    </option>
                  ))}
                </select>
                <span className="campo__ajuda">
                  Identifica a fonte de captação associada a este documento.
                </span>
              </div>

              {/* Área de arrastar e soltar (Drag and Drop) */}
              <div className="campo">
                <label>Arquivo do Edital (limite de 20 MB)</label>
                <label
                  className={`soltar-arquivo ${arrastando ? 'soltar-arquivo--ativo' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setArrastando(true)
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    setArrastando(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setArrastando(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setArrastando(false)
                    if (e.dataTransfer.files?.[0]) {
                      tratarArquivo(e.dataTransfer.files[0])
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    disabled={processando}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        tratarArquivo(e.target.files[0])
                      }
                    }}
                  />
                  {arquivoPdf ? (
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--texto-base)' }}>
                        ✓ {arquivoPdf.name}
                      </p>
                      <p className="discreto">
                        Tamanho: {(arquivoPdf.size / (1024 * 1024)).toFixed(2)} MB · Pronto para envio
                      </p>
                      <button
                        type="button"
                        className="btn btn--sm btn--fantasma"
                        style={{ marginTop: 'var(--esp-2)' }}
                        onClick={(ev) => {
                          ev.preventDefault()
                          setArquivoPdf(null)
                        }}
                      >
                        Trocar arquivo
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--texto-base)' }}>
                        Arraste e solte o arquivo PDF aqui
                      </p>
                      <p className="discreto">ou clique para selecionar do computador</p>
                      <p className="campo__ajuda" style={{ marginTop: 'var(--esp-2)' }}>
                        Limite máximo: <strong>20 MB</strong> por documento. Apenas PDF.
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="card__rodape linha">
                <button
                  type="submit"
                  className="btn btn--primario"
                  disabled={!arquivoPdf || processando}
                >
                  {processando ? 'Processando edital...' : 'Processar edital e avançar →'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ABA 2: Colagem de URL */}
        {abaAtiva === 'url' && (
          <form onSubmit={submeterUrl} className="card__corpo">
            <div className="pilha">
              <div className="campo">
                <label htmlFor="fonte-url">Fonte de origem</label>
                <select
                  id="fonte-url"
                  className="select"
                  value={fonteUrlId}
                  onChange={(e) => setFonteUrlId(e.target.value)}
                  disabled={processando}
                >
                  {fontes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="url-edital">Endereço (URL) da publicação ou PDF</label>
                <input
                  id="url-edital"
                  type="url"
                  className="input"
                  placeholder="https://finep.gov.br/chamadas_publicas/chamadapublica/edital-2026.pdf"
                  value={urlEdital}
                  onChange={(e) => setUrlEdital(e.target.value)}
                  disabled={processando}
                  required
                />
                <span className="campo__ajuda">
                  Insira o link oficial do edital. O sistema registrará a oportunidade para análise.
                </span>
              </div>

              <div className="card__rodape linha">
                <button
                  type="submit"
                  className="btn btn--primario"
                  disabled={!urlEdital.trim() || processando}
                >
                  {processando ? 'Processando URL...' : 'Processar endereço e avançar →'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ABA 3: Cadastro Manual dos Campos */}
        {abaAtiva === 'manual' && (
          <form onSubmit={submeterManual} className="card__corpo">
            <div className="pilha pilha--lg">
              {/* Bloco 1: Dados Gerais */}
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
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      disabled={processando}
                      required
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-fonte">Fonte de Origem</label>
                    <select
                      id="man-fonte"
                      className="select"
                      value={fonteManualId}
                      onChange={(e) => setFonteManualId(e.target.value)}
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
                      value={orgaoFinanciador}
                      onChange={(e) => setOrgaoFinanciador(e.target.value)}
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
                      value={numeroEdital}
                      onChange={(e) => setNumeroEdital(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-modalidade">Modalidade</label>
                    <select
                      id="man-modalidade"
                      className="select"
                      value={modalidade}
                      onChange={(e) => setModalidade(e.target.value)}
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
                      value={abrangencia}
                      onChange={(e) => setAbrangencia(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Cronograma e Prazos */}
              <div className="pilha">
                <h3>2. Cronograma e Prazos</h3>
                <div className="grade-3">
                  <div className="campo">
                    <label htmlFor="man-data-pub">Data de Publicação</label>
                    <input
                      id="man-data-pub"
                      type="date"
                      className="input"
                      value={dataPublicacao}
                      onChange={(e) => setDataPublicacao(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-prazo">Prazo de Inscrição *</label>
                    <input
                      id="man-prazo"
                      type="date"
                      className="input"
                      value={prazoInscricao}
                      onChange={(e) => setPrazoInscricao(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-data-res">Resultado Previsto</label>
                    <input
                      id="man-data-res"
                      type="date"
                      className="input"
                      value={dataResultado}
                      onChange={(e) => setDataResultado(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Recursos Financeiros */}
              <div className="pilha">
                <h3>3. Valores e Contrapartida</h3>
                <div className="grade-2">
                  <div className="campo">
                    <label htmlFor="man-val-total">Valor Total Disponível (R$)</label>
                    <input
                      id="man-val-total"
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="Ex: 10000000"
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-val-max">Valor Máximo por Projeto (R$)</label>
                    <input
                      id="man-val-max"
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="Ex: 2500000"
                      value={valorMaximo}
                      onChange={(e) => setValorMaximo(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo" style={{ justifyContent: 'center' }}>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={exigeContrapartida}
                        onChange={(e) => setExigeContrapartida(e.target.checked)}
                        disabled={processando}
                      />
                      Exige contrapartida financeira
                    </label>
                  </div>

                  {exigeContrapartida && (
                    <div className="campo">
                      <label htmlFor="man-perc-contra">Percentual de Contrapartida (%)</label>
                      <input
                        id="man-perc-contra"
                        type="number"
                        step="0.1"
                        className="input"
                        placeholder="Ex: 15"
                        value={percentualContrapartida}
                        onChange={(e) => setPercentualContrapartida(e.target.value)}
                        disabled={processando}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco 4: Requisitos e Elegibilidade */}
              <div className="pilha">
                <h3>4. Requisitos e Elegibilidade</h3>
                <div className="grade-2">
                  <div className="campo">
                    <label>Portes de Empresa Aceitos</label>
                    <div className="linha" style={{ gap: 'var(--esp-3)' }}>
                      {['MEI', 'ME', 'EPP', 'MEDIA', 'GRANDE'].map((p) => (
                        <label key={p} className="checkbox">
                          <input
                            type="checkbox"
                            checked={portesAceitos.includes(p)}
                            onChange={() => togglePorte(p)}
                            disabled={processando}
                          />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="campo">
                    <label htmlFor="man-cnaes">CNAEs Aceitos (separados por vírgula)</label>
                    <input
                      id="man-cnaes"
                      type="text"
                      className="input"
                      placeholder="Ex: 27.22-8, 27.21-0"
                      value={cnaesAceitos}
                      onChange={(e) => setCnaesAceitos(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-areas">Áreas Temáticas</label>
                    <input
                      id="man-areas"
                      type="text"
                      className="input"
                      placeholder="Ex: ESG, Baterias elétricas, Energia"
                      value={areasTematicas}
                      onChange={(e) => setAreasTematicas(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-publico">Público-Alvo</label>
                    <input
                      id="man-publico"
                      type="text"
                      className="input"
                      placeholder="Ex: Empresas de tecnologia, indústrias"
                      value={publicoAlvo}
                      onChange={(e) => setPublicoAlvo(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-tempo">Tempo mínimo de fundação (meses)</label>
                    <input
                      id="man-tempo"
                      type="number"
                      className="input"
                      placeholder="Ex: 12"
                      value={tempoMinimoMeses}
                      onChange={(e) => setTempoMinimoMeses(e.target.value)}
                      disabled={processando}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="man-certidoes">Certidões Exigidas</label>
                    <input
                      id="man-certidoes"
                      type="text"
                      className="input"
                      placeholder="Ex: CND Federal, FGTS, CNDT"
                      value={certidoesExigidas}
                      onChange={(e) => setCertidoesExigidas(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                </div>

                <div className="linha" style={{ gap: 'var(--esp-6)', marginTop: 'var(--esp-2)' }}>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={exigeIct}
                      onChange={(e) => setExigeIct(e.target.checked)}
                      disabled={processando}
                    />
                    Exige parceria com ICT ou Universidade
                  </label>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={submissaoMultipla}
                      onChange={(e) => setSubmissaoMultipla(e.target.checked)}
                      disabled={processando}
                    />
                    Permite submissão múltipla de propostas
                  </label>
                </div>
              </div>

              {/* Bloco 5: Resumo Executivo */}
              <div className="campo">
                <label htmlFor="man-resumo">Resumo Executivo do Edital</label>
                <textarea
                  id="man-resumo"
                  className="textarea"
                  rows={4}
                  placeholder="Síntese dos objetivos, critérios de concessão e obrigações da empresa..."
                  value={resumoExecutivo}
                  onChange={(e) => setResumoExecutivo(e.target.value)}
                  disabled={processando}
                />
              </div>

              <div className="card__rodape linha">
                <button
                  type="submit"
                  className="btn btn--primario"
                  disabled={!titulo.trim() || processando}
                >
                  {processando ? 'Cadastrando edital...' : 'Cadastrar edital e ver análise →'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
