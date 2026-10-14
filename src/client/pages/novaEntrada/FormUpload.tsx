import { useState, type FormEvent } from 'react'
import { editais } from '../../api/editais'
import type { PropsFormulario, ValoresUpload } from './tipos'

const LIMITE_BYTES = 20 * 1024 * 1024 // 20 MB

// Lê o arquivo local e devolve só o conteúdo Base64 (sem o prefixo data:).
function lerComoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] || '')
    leitor.onerror = () => reject(new Error('Erro na leitura do arquivo local.'))
    leitor.readAsDataURL(arquivo)
  })
}

// Aba 1: upload de PDF por arrastar e soltar (limite 20 MB).
export function FormUpload({ fontes, valores, onAlterar, processando, onErro, processar }: PropsFormulario<ValoresUpload>) {
  const [arrastando, setArrastando] = useState(false)
  const { arquivo } = valores

  // Validação e seleção de arquivo com limite de 20 MB
  function tratarArquivo(file: File) {
    onErro(null)
    if (file.size > LIMITE_BYTES) {
      onAlterar({ arquivo: null })
      onErro(
        `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB) ultrapassa o limite máximo permitido de 20 MB.`
      )
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      onAlterar({ arquivo: null })
      onErro('Por favor, selecione um arquivo no formato PDF.')
      return
    }
    onAlterar({ arquivo: file })
  }

  function submeter(e: FormEvent) {
    e.preventDefault()
    if (!arquivo) {
      onErro('Selecione ou arraste um arquivo PDF de até 20 MB.')
      return
    }
    processar({
      mensagemInicial: 'Lendo arquivo PDF e enviando para processamento...',
      mensagemSucesso: 'Edital criado com sucesso! Redirecionando para o detalhe...',
      erroPadrao: 'Falha no processamento do arquivo.',
      executar: async (avisar) => {
        const base64 = await lerComoBase64(arquivo)
        avisar('Extraindo informações do documento e cadastrando edital...')
        return editais.criarPorUpload({ nome_arquivo: arquivo.name, arquivo_base64: base64, fonte_id: valores.fonteId })
      },
    })
  }

  return (
    <form onSubmit={submeter} className="card__corpo">
      <div className="pilha">
        <div className="campo">
          <label htmlFor="fonte-upload">Fonte de origem</label>
          <select
            id="fonte-upload"
            className="select"
            value={valores.fonteId}
            onChange={(e) => onAlterar({ fonteId: e.target.value })}
            disabled={processando}
          >
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} ({f.tipo})
              </option>
            ))}
          </select>
          <span className="campo__ajuda">Identifica a fonte de captação associada a este documento.</span>
        </div>

        {/* Área de arrastar e soltar */}
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
              if (e.dataTransfer.files?.[0]) tratarArquivo(e.dataTransfer.files[0])
            }}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              disabled={processando}
              onChange={(e) => {
                if (e.target.files?.[0]) tratarArquivo(e.target.files[0])
              }}
            />
            {arquivo ? (
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--texto-base)' }}>✓ {arquivo.name}</p>
                <p className="discreto">
                  Tamanho: {(arquivo.size / (1024 * 1024)).toFixed(2)} MB · Pronto para envio
                </p>
                <button
                  type="button"
                  className="btn btn--sm btn--fantasma"
                  style={{ marginTop: 'var(--esp-2)' }}
                  onClick={(ev) => {
                    ev.preventDefault()
                    onAlterar({ arquivo: null })
                  }}
                >
                  Trocar arquivo
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--texto-base)' }}>Arraste e solte o arquivo PDF aqui</p>
                <p className="discreto">ou clique para selecionar do computador</p>
                <p className="campo__ajuda" style={{ marginTop: 'var(--esp-2)' }}>
                  Limite máximo: <strong>20 MB</strong> por documento. Apenas PDF.
                </p>
              </div>
            )}
          </label>
        </div>

        <div className="card__rodape linha">
          <button type="submit" className="btn btn--primario" disabled={!arquivo || processando}>
            {processando ? 'Processando edital...' : 'Processar edital e avançar →'}
          </button>
        </div>
      </div>
    </form>
  )
}
