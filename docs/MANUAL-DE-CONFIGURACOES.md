# Manual de Configurações de Parâmetros do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Administradores do sistema, analistas de negócios e gestores de projetos da I9+.  
> **Objetivo:** Explicar detalhadamente cada parâmetro, campo configurável e regra do sistema, demonstrando como suas alterações impactam diretamente a coleta, a análise por IA, os cálculos de notas e o envio de alertas.

---

## 1. Visão Geral da Central de Configurações

O menu **Configurações** (`/configuracoes`) centraliza todas as variáveis operacionais e estratégicas da aplicação. 

Ao contrário de sistemas legados que exigem reinicialização de serviços ou edição de arquivos de texto complexos, **todas as alterações realizadas nesta tela são gravadas no banco de dados e entram em vigor imediatamente**, sem derrubar o servidor ou desconectar os usuários.

A central está estruturada em quatro grandes eixos:
1. **Empresa:** Perfil da I9+ e Critérios com Pesos de Avaliação.
2. **Coleta:** Fontes e Portais de Editais Monitorados.
3. **Notificações:** Alertas (E01 a E06), Lista de Destinatários e Servidor SMTP de E-mail.
4. **Sistema:** Parâmetros de Inteligência Artificial e Gerenciamento da Base de Dados.

---

## 2. Eixo Empresa: Perfil da I9+ (`Configurações › Perfil`)

O perfil corporativo representa a "identidade estratégica" da I9+ dentro do motor de decisão. A IA e o motor de critérios utilizam estes campos para verificar se a empresa cumpre os requisitos de participação de cada edital.

| Campo | O que representa | Impacto direto no funcionamento da aplicação |
| :--- | :--- | :--- |
| **Razão Social e Nome Fantasia** | Identificação cadastral oficial da empresa. | Utilizado em relatórios gerados, resumos executivos e na saudação dos alertas automáticos. |
| **CNPJ** | Número do Cadastro Nacional de Pessoa Jurídica. | **Campo Crítico:** Se o CNPJ estiver em branco ou com formato inválido/zerado, o processamento de novos editais fica retido em status `COLETADO` com aviso de pendência cadastral, pois editais exigem validação de CNPJ ativo. |
| **Porte da Empresa** | Microempresa (ME), Empresa de Pequeno Porte (EPP), Média ou Grande Empresa. | **Campo de Alta Sensibilidade:** Inúmeros editais de inovação (como PIPE-FAPESP ou editais FINEP Mulher/Inovacred) são exclusivos para micro ou pequenas empresas. Se a I9+ estiver configurada como "Pequena Empresa" e o edital exigir "Média/Grande", o critério eliminatório reprova o edital imediatamente como **Não Elegível (Fit 0)**. |
| **Faturamento Anual (R$)** | Receita bruta contábil do último exercício fiscal. | Comparado com o teto de faturamento estipulado pelo edital. Também define o valor máximo de subvenção que a empresa tem capacidade de pleitear sem violar regras de alavancagem financeira. |
| **CNAE Principal e Secundários** | Códigos Nacionais de Atividade Econômica. | Utilizado pela IA para atestar compatibilidade de objeto social. Se um edital exigir atuação exclusiva no setor aeroespacial e o CNAE for de consultoria em TI, a IA gera um apontamento de risco ou reprovação de elegibilidade. |
| **Setor de Atuação e Especialidades** | Áreas em que a I9+ atua (ex: Software, IA, Transformação Digital, Indústria 4.0). | Alimenta o vetor semântico de aderência temático da IA, pontuando os editais focados nessas verticais. |
| **Localização (UF e Município)** | Estado da federação e município da sede da empresa. | Impacta editais de Fundações Estaduais de Amparo à Pesquisa (FAPs) e editais de superintendências regionais (SUDENE, SUDAM). Editais restritos a outros estados são classificados como não elegíveis para a I9+. |
| **Histórico de Fomento e Projetos Anteriores** | Relação de projetos já executados com recursos públicos ou privados. | Pontua positivamente nos critérios de experiência prévia da empresa, elevando a Nota de Fit em chamadas de maior maturidade tecnológica (TRL 6 a 9). |
| **Certificações (ISO, CMMI, etc.)** | Títulos de conformidade e qualidade técnica. | Editais que exigem ou bonificam certificações internacionais utilizam este campo para conceder pontuação extra no cômputo do fit. |

---

## 3. Eixo Empresa: Critérios e Pesos (`Configurações › Critérios`)

O motor de decisão (`motorCriterios.ts`) executa duas operações matemáticas a cada novo edital:
1. **Validação de Eliminatórias:** Se reprovado em qualquer regra eliminatória, o edital recebe **Fit 0 (Não Elegível)** e não avança para o pipeline prioritário.
2. **Ponderação de Pontuáveis:** Soma ponderada dos critérios aprovados que resulta em uma nota de **0 a 100**.

### 3.1. Campos Disponíveis para Criação de Critérios

- `porte_empresa`: Avalia se o porte da I9+ atende ao público-alvo do edital.
- `contrapartida_minima`: Percentual de contrapartida financeira exigida.
- `valor_financiamento`: Faixa orçamentária do projeto (mínimo e máximo).
- `prazo_execucao`: Duração máxima do projeto em meses.
- `exige_ict_parceira`: Se é obrigatório firmar parceria com Universidade/Instituto de Pesquisa.
- `area_tematica`: Alinhamento das áreas de pesquisa com as competências da I9+.

### 3.2. Operadores Lógicos Suportados
- **Igual a (`=`) / Diferente de (`!=`)**: Checagens categóricas exatas.
- **Maior que (`>`) / Menor que (`<`)**: Checagens de valores numéricos de orçamento, prazos ou contrapartidas.
- **Maior ou igual (`>=`) / Menor ou igual (`<=`)**: Faixas inclusivas.
- **Contém (`contem`)**: Busca textual dentro de exigências ou descrições do edital.
- **Está na lista (`em_lista`)**: Comparações com múltiplos valores possíveis.

### 3.3. Configuração de Pesos e Impacto na Classificação

Cada critério pontuável recebe um peso de **1 (baixa relevância) a 5 (alta prioridade estratégica)**. A nota final categoriza o edital nas seguintes faixas visuais e operacionais:

| Faixa de Nota | Classificação | Cor Visual | Impacto no Sistema |
| :---: | :---: | :---: | :--- |
| **70 a 100** | **Alto Fit** | Verde | Destaque no topo do Dashboard, inclusão no bloco "Top Fit" e disparo imediato do **Alerta E01**. |
| **40 a 69** | **Médio Fit** | Amarelo | Edital viável. Exibido na listagem com recomendação de revisão técnica prévia da viabilidade orçamentária. |
| **1 a 39** | **Baixo Fit** | Cinza | Baixa compatibilidade com os interesses atuais da empresa. Não gera alertas intrusivos. |
| **0** | **Não Elegível** | Vermelho | Reprovado por restrição legal, de porte ou territorial. O sistema impede submissão sem justificativa manual de resgate. |

> **Importante:** Ao alterar a fórmula ou peso de um critério, os editais que estão sendo processados ou reavaliados passam a utilizar a nova regra no mesmo instante.

---

## 4. Eixo Coleta: Fontes Monitoradas (`Configurações › Fontes`)

Gerencia quais portais oficiais são vasculhados periodicamente em busca de novas oportunidades.

| Campo | Opções / Formato | Impacto no Sistema |
| :--- | :--- | :--- |
| **Nome da Fonte** | Texto livre (ex: "FINEP Chamadas Públicas") | Identifica a procedência do edital na listagem, no dashboard e no histórico. |
| **URL Base** | Endereço web completo | Ponto de entrada que o robô de coleta acessa para iniciar a varredura. |
| **Tipo de Coleta** | `API`, `HTML` ou `PAGINA_JS` | **Define o motor de execução:**<br>• `API`: Chamada JSON de alta velocidade sem carregar interface gráfica.<br>• `HTML`: Download rápido via HTTP e parsing de tags com `cheerio`.<br>• `PAGINA_JS`: Inicia o navegador invisível **Playwright (Chromium)** para portais que só montam tabelas via JavaScript. |
| **Periodicidade** | Minutos / Horas (padrão: 60 min) | Intervalo de tempo entre as execuções automáticas do agendador (`agendador.ts`). |
| **Seletor CSS / Padrão**| Expressão CSS (ex: `.card-edital a`) | Localizador dos links dos editais dentro da página HTML. |
| **Ativa / Pausada** | Alternador (Toggle) | Quando desativada, o sistema interrompe as varreduras nessa fonte sem apagar os editais já coletados anteriormente. |

---

## 5. Eixo Notificações: Alertas (`Configurações › Alertas`)

O sistema conta com 6 eventos automáticos (E01 a E06). Cada alerta possui parâmetros próprios de disparo e canais de notificação (painel interno e/ou e-mail).

### 5.1. Detalhamento dos Gatilhos

1. **Alerta E01 — Novo Edital com Alto Fit:**
   - **Parâmetro configurável:** *Nota Mínima de Fit* (padrão: 70 pontos).
   - **Impacto:** Dispara assim que a IA conclui a análise de um edital e a nota alcançada é maior ou igual ao parâmetro. Envia notificação detalhada com resumo do edital e pontos de destaque para os analistas comerciais.
2. **Alerta E02 — Prazo Próximo:**
   - **Parâmetros configuráveis:** *Dias de Antecedência* (ex: 5 dias e 2 dias antes).
   - **Impacto:** A rotina diária analisa os editais elegíveis em andamento e notifica os responsáveis para evitar perda de prazo de submissão de propostas.
3. **Alerta E03 — Verificação Necessária:**
   - **Impacto:** Dispara automaticamente quando a IA detecta inconsistência nos dados (ex: orçamento ambíguo no edital) ou quando o edital é encaminhado para `EM_REVISAO`.
4. **Alerta E04 — Resumo Semanal:**
   - **Parâmetros configuráveis:** *Dia da Semana* e *Horário de Envio* (ex: Toda segunda-feira às 08:00).
   - **Impacto:** Consolida um boletim executivo com todos os editais abertos, editais com prazo na semana e novas oportunidades captadas.
5. **Alerta E05 — Edital Retificado:**
   - **Impacto:** Monitora editais já cadastrados. Caso a fonte publique nova errata, retificação de cronograma ou termo aditivo, o sistema atualiza o registro e avisa os gestores imediatamente.
6. **Alerta E06 — Falha na Coleta:**
   - **Impacto:** Alerta exclusivo para administradores de TI quando uma fonte monitorada fica fora do ar ou tem sua estrutura alterada por mais de 3 tentativas.

---

## 6. Eixo Notificações: Destinatários e E-mail (`Configurações › Destinatários e E-mail`)

### 6.1. Destinatários
Permite cadastrar membros da equipe interna da I9+ ou parceiros externos que devem receber comunicados.
- Cada destinatário pode ser associado seletivamente a alertas específicos (ex: equipe comercial recebe E01 e E02; equipe técnica recebe E03 e E05; TI recebe E06).
- Desativar um destinatário interrompe o recebimento sem necessidade de recadastrá-lo no futuro.

### 6.2. Servidor SMTP (E-mail)
- `smtp_host`: Endereço do servidor SMTP (ex: `smtp.gmail.com` ou `smtp.office365.com`).
- `smtp_porta`: Porta de conexão (`465` para SSL, `587` para TLS).
- `smtp_usuario`: Conta de e-mail institucional remetente.
- `smtp_senha`: Senha de aplicativo protegida.
- `smtp_nome_remetente`: Nome exibido na caixa de entrada (ex: `Editais I9+ <notificacoes@i9mais.com.br>`).
- *Impacto do campo vazio:* Se `smtp_host` for deixado em branco, o sistema não emite erros e ativa o **modo terminal**, apenas imprimindo o e-mail no console do servidor.

---

## 7. Eixo Sistema: Inteligência Artificial (`Configurações › IA`)

Controla o motor cognitivo que realiza a leitura dos PDFs e atende o chat.

| Parâmetro | Valores Possíveis | Impacto no Funcionamento da Aplicação |
| :--- | :--- | :--- |
| **Modo de Operação** | `LOCAL` ou `NUVEM` | Alterna entre o Ollama rodando na própria máquina/servidor ou o serviço Ollama Cloud. |
| **URL do Ollama** | URL HTTP (padrão: `http://localhost:11434`) | Endereço do daemon Ollama. Permite apontar para outro servidor com GPU na mesma rede local. |
| **Chave de API (Nuvem)** | Token Bearer secreto | Utilizado exclusivamente no modo `NUVEM` para autenticar na infraestrutura gerenciada do Ollama. |
| **Modelo Selecionado** | Ex: `gemma2:latest` | Define qual modelo LLM realiza a extração e a síntese. |
| **Limite Diário de Chat** | Número inteiro (padrão: 20) | Quantidade máxima de perguntas que cada usuário pode fazer à IA por dia. Protege o servidor contra sobrecarga de GPU e controla custos de tokens no modo nuvem. |

---

## 8. Eixo Sistema: Base de Dados (`Configurações › Base`)

Controla a persistência e compartilhamento das informações entre os membros da equipe.

| Opção / Recurso | Como funciona | Impacto no Funcionamento da Aplicação |
| :--- | :--- | :--- |
| **Modo da Base** | `LOCAL` (neste computador) ou `NUVEM` (Turso) | No modo local, usa o arquivo `data/editais.db`. No modo nuvem, conecta-se ao cluster distribuído do Turso, sincronizando em tempo real com toda a equipe da I9+. |
| **URL do Turso e Auth Token** | `libsql://...` e token JWT | Credenciais de acesso ao cluster. Salvas em `data/base-conexao.json` de forma segura. |
| **Baixar Base (Exportar)** | Gera arquivo `.db` | Cria um instantâneo seguro de todos os editais, usuários e configurações para migração ou cópia de segurança. |
| **Importar Base** | Substitui a base atual por um arquivo `.db` | Valida o esquema, cria um backup automático de restauração prévia em `data/backups/` e carrega os novos dados na hora. |
| **Restaurar Backup** | Lista de snapshots anteriores | Permite desfazer importações acidentais com um único clique. |
