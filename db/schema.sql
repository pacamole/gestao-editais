-- Esquema completo do banco, traduzido da especificação para SQLite.
-- Não há migrações: altere este arquivo e rode `npm run db:reset`.
--
-- Convenções:
--   uuid         -> TEXT (gerado na aplicação com crypto.randomUUID)
--   timestamptz  -> TEXT ISO 8601 em UTC ("2026-09-28T14:00:00.000Z")
--   date         -> TEXT "AAAA-MM-DD"
--   boolean      -> INTEGER 0/1
--   numeric      -> REAL
--   text[]/jsonb -> TEXT com JSON
--   enum         -> TEXT com CHECK
--
-- Em listas extraídas do edital, NULL e '[]' têm significados diferentes:
-- NULL = não localizado no documento (vira INDETERMINADO);
-- '[]' = o edital não restringe (LISTA_VAZIA_OU_CONTEM aprova).

CREATE TABLE usuario (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash  TEXT NOT NULL,
  papel       TEXT NOT NULL CHECK (papel IN ('ANALISTA', 'GESTOR')),
  ativo       INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em   TEXT NOT NULL
);

-- Sessões de login (cookie guarda o id).
CREATE TABLE sessao (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  criada_em   TEXT NOT NULL,
  expira_em   TEXT NOT NULL
);
CREATE INDEX idx_sessao_usuario ON sessao(usuario_id);

CREATE TABLE fonte (
  id                    TEXT PRIMARY KEY,
  nome                  TEXT NOT NULL,
  url_base              TEXT,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('SCRAPER', 'RSS', 'UPLOAD_MANUAL', 'URL_MANUAL')),
  frequencia_cron       TEXT,
  ativo                 INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  ultima_coleta_em      TEXT,
  ultimo_status         TEXT CHECK (ultimo_status IN ('SUCESSO', 'FALHA', 'PARCIAL')),
  ultima_mensagem_erro  TEXT
);

-- Log das execuções de coleta (P08: últimas 10 execuções, itens coletados; E06: falhas consecutivas).
CREATE TABLE coleta_execucao (
  id               TEXT PRIMARY KEY,
  fonte_id         TEXT NOT NULL REFERENCES fonte(id) ON DELETE CASCADE,
  iniciada_em      TEXT NOT NULL,
  finalizada_em    TEXT,
  status           TEXT CHECK (status IN ('SUCESSO', 'FALHA', 'PARCIAL')),
  itens_coletados  INTEGER NOT NULL DEFAULT 0,
  mensagem_erro    TEXT
);
CREATE INDEX idx_coleta_execucao_fonte ON coleta_execucao(fonte_id, iniciada_em);

CREATE TABLE edital (
  id                           TEXT PRIMARY KEY,
  titulo                       TEXT NOT NULL,
  orgao_financiador            TEXT,
  numero_edital                TEXT,
  modalidade                   TEXT CHECK (modalidade IN ('SUBVENCAO', 'CREDITO', 'PREMIO', 'LICITACAO', 'CHAMADA_PUBLICA', 'OUTRO')),
  fonte_id                     TEXT NOT NULL REFERENCES fonte(id),
  url_original                 TEXT,
  url_documento                TEXT,
  texto_extraido               TEXT,
  hash_documento               TEXT,
  data_publicacao              TEXT,
  prazo_inscricao              TEXT,
  data_resultado_prevista      TEXT,
  valor_total_disponivel       REAL,
  valor_maximo_por_projeto     REAL,
  exige_contrapartida          INTEGER CHECK (exige_contrapartida IN (0, 1)),
  percentual_contrapartida     REAL,
  publico_alvo                 TEXT,
  cnaes_aceitos                TEXT,
  portes_aceitos               TEXT,
  natureza_juridica_aceita     TEXT,
  abrangencia_geografica       TEXT,
  exige_ict_parceira           INTEGER CHECK (exige_ict_parceira IN (0, 1)),
  tempo_minimo_fundacao_meses  INTEGER,
  faturamento_minimo           REAL,
  faturamento_maximo           REAL,
  certidoes_exigidas           TEXT,
  areas_tematicas              TEXT,
  permite_submissao_multipla   INTEGER CHECK (permite_submissao_multipla IN (0, 1)),
  resumo_executivo             TEXT,
  status                       TEXT NOT NULL DEFAULT 'COLETADO' CHECK (status IN (
                                 'COLETADO', 'EM_ANALISE', 'ANALISADO', 'FALHA', 'EM_REVISAO',
                                 'APROVADO', 'DESCARTADO', 'INSCRITO', 'ENCERRADO', 'EXPIRADO')),
  -- §9 Retificação
  retificado                   INTEGER NOT NULL DEFAULT 0 CHECK (retificado IN (0, 1)),
  -- Mensagem do último erro de processamento (status FALHA, "requer leitura manual")
  erro_processamento           TEXT,
  criado_em                    TEXT NOT NULL,
  atualizado_em                TEXT NOT NULL
);
CREATE INDEX idx_edital_status ON edital(status);
CREATE INDEX idx_edital_prazo ON edital(prazo_inscricao);
CREATE INDEX idx_edital_hash ON edital(hash_documento);
CREATE INDEX idx_edital_url_documento ON edital(url_documento);
CREATE INDEX idx_edital_numero_orgao ON edital(numero_edital, orgao_financiador);

-- §9 Retificação: versão anterior do edital preservada antes do reprocessamento.
CREATE TABLE edital_versao (
  id              TEXT PRIMARY KEY,
  edital_id       TEXT NOT NULL REFERENCES edital(id) ON DELETE CASCADE,
  hash_documento  TEXT,
  dados           TEXT NOT NULL, -- JSON com a linha de edital completa
  criado_em       TEXT NOT NULL
);
CREATE INDEX idx_edital_versao_edital ON edital_versao(edital_id);

CREATE TABLE evidencia (
  id              TEXT PRIMARY KEY,
  edital_id       TEXT NOT NULL REFERENCES edital(id) ON DELETE CASCADE,
  campo           TEXT NOT NULL,
  trecho_literal  TEXT NOT NULL,
  pagina          INTEGER,
  confianca       TEXT CHECK (confianca IN ('ALTA', 'MEDIA', 'BAIXA'))
);
CREATE INDEX idx_evidencia_edital ON evidencia(edital_id, campo);

CREATE TABLE perfil_empresa (
  id                                   INTEGER PRIMARY KEY CHECK (id = 1),
  razao_social                         TEXT NOT NULL,
  nome_fantasia                        TEXT,
  cnpj                                 TEXT NOT NULL,
  cnae_principal                       TEXT NOT NULL,
  cnaes_secundarios                    TEXT,
  porte                                TEXT NOT NULL CHECK (porte IN ('MEI', 'ME', 'EPP', 'MEDIA', 'GRANDE')),
  natureza_juridica                    TEXT NOT NULL,
  data_fundacao                        TEXT NOT NULL,
  faturamento_anual                    REAL,
  uf                                   TEXT NOT NULL CHECK (length(uf) = 2),
  municipio                            TEXT NOT NULL,
  areas_atuacao                        TEXT NOT NULL DEFAULT '[]',
  palavras_chave                       TEXT NOT NULL DEFAULT '[]',
  possui_ict_parceira                  INTEGER NOT NULL DEFAULT 0 CHECK (possui_ict_parceira IN (0, 1)),
  certidoes_disponiveis                TEXT,
  capacidade_contrapartida_percentual  REAL,
  valor_minimo_interesse               REAL,
  prazo_minimo_preparo_dias            INTEGER,
  atualizado_em                        TEXT NOT NULL
);

CREATE TABLE criterio (
  id                   TEXT PRIMARY KEY,
  nome                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('ELIMINATORIO', 'PONTUAVEL')),
  campo_edital         TEXT NOT NULL,
  campo_perfil         TEXT,
  operador             TEXT NOT NULL CHECK (operador IN (
                         'CONTEM', 'NAO_CONTEM', 'INTERSECCAO', 'CONTIDO_EM', 'IGUAL', 'DIFERENTE',
                         'MAIOR_QUE', 'MENOR_QUE', 'ENTRE', 'VERDADEIRO', 'FALSO', 'LISTA_VAZIA_OU_CONTEM')),
  valor_referencia     TEXT,
  peso                 INTEGER CHECK (peso BETWEEN 1 AND 10),
  mensagem_reprovacao  TEXT,
  ativo                INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  -- P07: reordenar
  ordem                INTEGER NOT NULL DEFAULT 0,
  CHECK (tipo = 'ELIMINATORIO' OR peso IS NOT NULL)
);

CREATE TABLE avaliacao (
  id                        TEXT PRIMARY KEY,
  edital_id                 TEXT NOT NULL REFERENCES edital(id) ON DELETE CASCADE,
  status_elegibilidade      TEXT NOT NULL CHECK (status_elegibilidade IN ('ELEGIVEL', 'INELEGIVEL', 'INDETERMINADO')),
  nota_fit                  REAL,
  classificacao             TEXT CHECK (classificacao IN ('ALTO', 'MEDIO', 'BAIXO')),
  criterios_violados        TEXT,
  criterios_indeterminados  TEXT,
  detalhamento_pontuacao    TEXT,
  nota_ajustada_manual      REAL,
  ajustada_por              TEXT REFERENCES usuario(id),
  -- Versão do perfil usada no cálculo (glossário: "com uma dada versão do perfil")
  perfil_atualizado_em      TEXT,
  calculado_em              TEXT NOT NULL
);
CREATE INDEX idx_avaliacao_edital ON avaliacao(edital_id, calculado_em);

CREATE TABLE revisao (
  id              TEXT PRIMARY KEY,
  edital_id       TEXT NOT NULL REFERENCES edital(id) ON DELETE CASCADE,
  usuario_id      TEXT NOT NULL REFERENCES usuario(id),
  acao            TEXT NOT NULL CHECK (acao IN (
                    'APROVOU', 'DESCARTOU', 'CORRIGIU_CAMPO', 'AJUSTOU_NOTA', 'REPROCESSOU',
                    'MARCOU_INSCRITO', 'REGISTROU_RESULTADO')),
  campo_alterado  TEXT,
  valor_anterior  TEXT,
  valor_novo      TEXT,
  comentario      TEXT,
  criado_em       TEXT NOT NULL,
  CHECK (acao <> 'DESCARTOU' OR (comentario IS NOT NULL AND trim(comentario) <> ''))
);
CREATE INDEX idx_revisao_edital ON revisao(edital_id, criado_em);

CREATE TABLE conversa (
  id             TEXT PRIMARY KEY,
  edital_id      TEXT NOT NULL REFERENCES edital(id) ON DELETE CASCADE,
  usuario_id     TEXT NOT NULL REFERENCES usuario(id),
  criada_em      TEXT NOT NULL,
  atualizada_em  TEXT NOT NULL,
  UNIQUE (edital_id, usuario_id)
);

CREATE TABLE mensagem (
  id                TEXT PRIMARY KEY,
  conversa_id       TEXT NOT NULL REFERENCES conversa(id) ON DELETE CASCADE,
  papel             TEXT NOT NULL CHECK (papel IN ('USUARIO', 'ASSISTENTE')),
  conteudo          TEXT NOT NULL,
  tokens_estimados  INTEGER,
  criada_em         TEXT NOT NULL
);
CREATE INDEX idx_mensagem_conversa ON mensagem(conversa_id, criada_em);

CREATE TABLE notificacao_log (
  id             TEXT PRIMARY KEY,
  tipo           TEXT NOT NULL CHECK (tipo IN ('E01', 'E02', 'E03', 'E04', 'E05', 'E06')),
  edital_id      TEXT REFERENCES edital(id) ON DELETE SET NULL,
  -- Regra anti-spam: (tipo, edital_id, marco) nunca se repete. Ex.: marco '15d' no E02.
  marco          TEXT NOT NULL DEFAULT '',
  destinatarios  TEXT NOT NULL,
  assunto        TEXT NOT NULL,
  enviado_em     TEXT NOT NULL,
  status_envio   TEXT NOT NULL CHECK (status_envio IN ('ENVIADO', 'FALHOU'))
);
CREATE INDEX idx_notificacao_marco ON notificacao_log(tipo, edital_id, marco);

-- P09: uma linha por tipo de notificação.
CREATE TABLE config_alerta (
  tipo           TEXT PRIMARY KEY CHECK (tipo IN ('E01', 'E02', 'E03', 'E04', 'E05', 'E06')),
  ativo          INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  destinatarios  TEXT NOT NULL DEFAULT '[]', -- JSON; vazio = papéis padrão do tipo
  parametros     TEXT NOT NULL DEFAULT '{}'  -- JSON; ex.: {"nota_minima": 70}
);

-- Configurações gerais chave/valor (ex.: limite diário do chat, CH07).
CREATE TABLE config (
  chave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);
