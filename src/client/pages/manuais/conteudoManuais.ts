// Textos completos dos três manuais homologados para a I9+

export interface ManualInfo {
  id: 'uso' | 'integracao' | 'configuracao'
  titulo: string
  subtitulo: string
  nomeArquivo: string
  conteudo: string
}

export const manualUso: ManualInfo = {
  id: 'uso',
  titulo: 'Documentação de Uso',
  subtitulo: 'Requisitos computacionais para LLM local e hospedagem em servidor corporativo',
  nomeArquivo: 'MANUAL-DE-USO.md',
  conteudo: `# Documentação de Uso do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Equipe técnica, administradores de TI e gestores de inovação da I9+.  
> **Objetivo:** Orientar sobre o uso do sistema, requisitos computacionais para execução de Inteligência Artificial (LLM) localmente e requisitos para hospedagem e implantação em servidor corporativo.

---

## 1. Visão Geral do Sistema

O **Gestor Inteligente de Editais** foi concebido para transformar o processo de captação de recursos públicos e privados de fomento na **I9+**. Ele monitora fontes oficiais (FINEP, EMBRAPII, FAPs, ministérios, agências estaduais e plataformas de inovação), analisa automaticamente a documentação em PDF via Inteligência Artificial, avalia a elegibilidade e a aderência estratégica da empresa (calculando a Nota de Fit) e avisa a equipe por e-mail e painel antes que os prazos expirem.

### Principais Módulos Operacionais:
1. **Dashboard (\`/\`):** Visão executiva com totalizadores, editais urgentes (prazos nos próximos 7 dias), distribuição de classificação, editais de alto fit e integridade das fontes monitoradas.
2. **Editais (\`/editais\`):** Tabela analítica de oportunidades captadas, filtros avançados por relevância, status, faixa de fit, busca textual e ações em lote.
3. **Nova Entrada (\`/editais/novo\`):** Cadastro assistido de editais via envio de arquivo PDF, endereço web (URL) ou preenchimento manual completo.
4. **Detalhes do Edital (\`/editais/:id\`):** Dossiê completo do edital contendo justificativa da nota, avaliação de cada critério, dados extraídos do PDF, histórico de revisões e **Chat interativo com IA** para tirar dúvidas sobre o documento.
5. **Configurações (\`/configuracoes\`):** Gestão integrada de perfil da I9+, critérios de fit, fontes, alertas e integrações técnicas.
6. **Manuais (\`/manuais\`):** Central de documentação operacional, guias de integração e parâmetros do sistema.

---

## 2. Requisitos Computacionais para Usar LLM Localmente

O sistema integra-se ao framework **Ollama**, permitindo que modelos de linguagem de código aberto (LLMs) sejam executados inteiramente dentro da infraestrutura da I9+, garantindo **sigilo absoluto de dados corporativos e ausência de custos por token**.

O modelo padrão homologado para o sistema é o **\`gemma2:latest\`** (Gemma 2 9B), reconhecido pela alta capacidade de raciocínio em português brasileiro e interpretação precisa de termos jurídicos/editalícios.

### 2.1. Matriz de Requisitos de Hardware para Execução Local

| Componente | Configuração Mínima (Operação Básica) | Configuração Recomendada (Alta Performance) |
| :--- | :--- | :--- |
| **Processador (CPU)** | 4 a 6 núcleos com suporte a **AVX2** (Intel Core i5 8ª ger+ / AMD Ryzen 5 3600+) | 8 núcleos ou mais (Intel Core i7/i9 12ª ger+ / AMD Ryzen 7 5700X+) |
| **Memória RAM** | **16 GB DDR4/DDR5** | **32 GB DDR4/DDR5** (ou superior) |
| **Placa de Vídeo (GPU)** | Não obrigatória (execução via CPU / *CPU offload*) | **NVIDIA dedicada com 8 GB a 16 GB VRAM** (ex: RTX 3060 12GB, RTX 4060 Ti 16GB, RTX 3080/4070, A2000/A4000) com suporte a **CUDA** |
| **Armazenamento** | SSD com no mínimo **15 GB livres** | **SSD NVMe M.2** com leitura > 3000 MB/s e **30 GB livres** |
| **Sistema Operacional** | Windows 10/11 64-bit, Ubuntu 22.04+ LTS ou macOS 13+ | Windows 11 Pro 64-bit, Ubuntu 24.04 LTS ou macOS com chip Apple Silicon |

### 2.2. Detalhamento e Justificativas Técnicas

1. **Memória RAM e VRAM:**
   - O modelo \`gemma2:latest\` quantizado em 4 bits (Q4_K_M) ocupa aproximadamente **5,5 GB a 6,5 GB** de memória na inicialização.
   - Durante a leitura de um edital longo (PDFs de 40 a 100 páginas), o contexto da janela de atenção aloca memória adicional para o vetor de tokens.
   - Em máquinas sem GPU dedicada, a memória RAM do computador é compartilhada entre o modelo, o sistema operacional e o servidor da aplicação. Por isso, **16 GB é o piso mínimo absoluto**.
   - Em máquinas com GPU NVIDIA (com VRAM suficiente para carregar todas as camadas do modelo), a velocidade de geração salta de ~3 a 8 tokens/segundo para **35 a 65 tokens/segundo**.

2. **Apple Silicon (Mac Mini / MacBook / Mac Studio):**
   - Dispositivos Apple Silicon (M1/M2/M3/M4) utilizam arquitetura de **Memória Unificada**. Um Mac com **16 GB ou 24 GB de memória unificada** roda o modelo \`gemma2:latest\` com desempenho excelente, utilizando aceleração via Metal e Neural Engine.

3. **Alternativa em Máquinas Modestas (Ollama Cloud):**
   - Caso um membro da equipe esteja utilizando um notebook ou computador sem 16 GB de RAM ou sem placa de vídeo, não é necessário fazer upgrade de hardware. Basta ativar o modo **Ollama Cloud** em \`Configurações › Inteligência Artificial\`, inserindo uma chave de API do serviço em nuvem.

### 2.3. Instalação e Inicialização do Ollama

1. Baixe o instalador oficial em: [https://ollama.com](https://ollama.com).
2. Conclua a instalação e abra o terminal (PowerShell, Prompt ou Bash).
3. Baixe o modelo homologado:
   \`\`\`bash
   ollama pull gemma2:latest
   \`\`\`
4. Verifique se o serviço está ativo (por padrão o Ollama roda como serviço em segundo plano na porta 11434):
   \`\`\`bash
   ollama list
   \`\`\`
5. No Gestor de Editais, acesse \`Configurações › Inteligência Artificial\` e confirme se o status exibe **"Conectado ao Ollama local"**.

---

## 3. Requisitos Computacionais para Hospedagem em Servidor

O Gestor Inteligente de Editais foi arquitetado em **Node.js (Express + TypeScript)** integrado a banco de dados relacional (SQLite nativo ou Turso na nuvem) e um navegador invisível (**Playwright Chromium**) para raspagem de páginas dinâmicas.

A hospedagem em servidor corporativo pode ser estruturada em dois cenários principais:

### 3.1. Cenário A — Servidor de Aplicação Web (IA via Cloud ou Servidor de IA Separado)
*Cenário recomendado caso a I9+ queira alocar um servidor menor para a aplicação e utilizar Ollama Cloud ou um servidor GPU dedicado para o modelo.*

| Recurso | Requisito Mínimo | Requisito Recomendado |
| :--- | :--- | :--- |
| **vCPUs** | 2 vCPUs (x86_64 moderno) | 4 vCPUs |
| **Memória RAM** | **4 GB** | **8 GB** |
| **Armazenamento** | 30 GB SSD | 60 GB a 100 GB SSD NVMe |
| **Tráfego de Rede** | 100 Mbps com IP fixo ou domínio interno | 1 Gbps com IP público estático |
| **Sistema Operacional**| Ubuntu Server 22.04 LTS / 24.04 LTS | Ubuntu Server 24.04 LTS |

*Nota de consumo:* O processo Node consome aproximadamente 250 MB a 400 MB de RAM. Cada instância do Chromium headless do Playwright aberta temporariamente para ler portais com JavaScript consome entre 200 MB e 400 MB. A margem de 4 GB a 8 GB garante estabilidade contínua.

### 3.2. Cenário B — Servidor All-in-One (Aplicação Web + LLM Local no Próprio Servidor)
*Cenário para funcionamento 100% autônomo na rede privada da I9+, sem dependência de serviços externos de IA.*

| Recurso | Requisito Mínimo (CPU Only) | Requisito Recomendado (Com GPU) |
| :--- | :--- | :--- |
| **vCPUs** | 8 vCPUs | 4 a 8 vCPUs |
| **Memória RAM** | **32 GB RAM** | **16 GB a 32 GB RAM** |
| **Acelerador (GPU)**| N/A | **NVIDIA Tesla T4, A10G, RTX A4000 ou RTX 4000 Ada (16 GB VRAM+)** |
| **Armazenamento** | 80 GB SSD | 150 GB SSD NVMe |
| **Sistema Operacional**| Ubuntu Server 22.04 / 24.04 LTS | Ubuntu Server com drivers NVIDIA e CUDA 12+ |

---

## 4. Passo a Passo de Implantação no Servidor (Linux / Ubuntu)

### 4.1. Instalação das Ferramentas Básicas
\`\`\`bash
# Atualize os repositórios
sudo apt update && sudo apt upgrade -y

# Instale Node.js 24.x LTS e Git
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Verifique as versões
node -v    # Deve ser >= v24.0.0
npm -v
git -v
\`\`\`

### 4.2. Clonagem e Preparação da Aplicação
\`\`\`bash
# Clone o repositório
git clone https://github.com/pacamole/gestao-editais.git
cd gestao-editais

# Instale as dependências
npm install

# Instale os binários do Chromium para o Playwright (usado na coleta web)
npx playwright install-deps chromium
npx playwright install chromium

# Crie o arquivo de variáveis de ambiente
cp .env.example .env
\`\`\`

### 4.3. Configuração do \`.env\` para o Servidor
Edite o arquivo \`.env\`:
\`\`\`ini
# Endereço e porta em que o sistema escutará
PORT=3000
APP_URL=http://192.168.1.100:3000   # Substitua pelo IP do servidor ou domínio oficial

# Caminho do banco SQLite
DATABASE_PATH=data/editais.db

# Configurações iniciais do administrador
GESTOR_NOME=Administrador I9+
GESTOR_EMAIL=gestor@i9mais.com.br
GESTOR_SENHA=senha-forte-inicial
\`\`\`

### 4.4. Inicialização do Banco de Dados e Build de Produção
\`\`\`bash
# Criação do banco SQLite com o esquema estruturado
npm run db:reset

# Compilação dos bundles de front-end (Vite) e back-end (TypeScript)
npm run build
\`\`\`

### 4.5. Execução Contínua via PM2 (Process Manager)
Para garantir que a aplicação reinicie automaticamente caso o servidor seja reiniciado:
\`\`\`bash
# Instale o PM2 globalmente
sudo npm install -g pm2

# Inicie o servidor
pm2 start npm --name "gestao-editais" -- run start

# Configure o PM2 para inicializar no boot do Linux
pm2 startup
pm2 save
\`\`\`

### 4.6. Configuração de Proxy Reverso com Nginx (Opcional, com HTTPS)
\`\`\`nginx
server {
    listen 80;
    server_name editais.i9mais.com.br;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`
`,
}

export const manualIntegracao: ManualInfo = {
  id: 'integracao',
  titulo: 'Manual de Integrações do Sistema',
  subtitulo: 'Configuração de IA (Ollama/Nuvem), Banco de Dados (SQLite/Turso), E-mail (SMTP) e Coleta',
  nomeArquivo: 'MANUAL-DE-INTEGRACOES.md',
  conteudo: `# Manual de Integrações do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Desenvolvedores, arquitetos de software e administradores de sistemas.  
> **Objetivo:** Documentar detalhadamente a configuração, arquitetura e fluxo de funcionamento de todas as integrações externas e internas do sistema: Inteligência Artificial (Ollama / Ollama Cloud), Banco de Dados (SQLite / Turso na nuvem), Notificações por E-mail (SMTP) e Coleta de Editais (FINEP API, portais web e Playwright).

---

## 1. Visão Geral da Arquitetura de Integração

O Gestor de Editais adota o padrão de **Arquitetura em Camadas com Portas e Adaptadores (Hexagonal)**:
- **Controladores (\`src/server/controllers\`):** Recebem as chamadas HTTP da interface React.
- **Serviços (\`src/server/servicos\`):** Orquestram a regra de negócio sem acoplamento a bibliotecas externas.
- **Portas (\`src/server/portas\`):** Definem contratos TypeScript puros (\`ModeloLinguagemPorta\`, \`EmailPorta\`).
- **Adaptadores (\`src/server/adaptadores\`):** Implementam a comunicação real com ferramentas externas (Ollama, provedores SMTP, Turso, Playwright).

Dessa forma, trocar um serviço de nuvem ou atualizar uma integração não afeta as regras de negócio de elegibilidade ou avaliação da I9+.

---

## 2. Integração 1: Inteligência Artificial (LLM)

A Inteligência Artificial atua em três momentos cruciais:
1. **Extração de Dados dos Editais (\`ExtracaoServico\`):** Lê o texto bruto indexado do edital e extrai parâmetros estruturados (objeto, valores orçamentários, contrapartida, prazos, porte da empresa elegível, exigências de ICT).
2. **Avaliação Automatizada de Elegibilidade (\`AvaliacaoServico\`):** Compara as cláusulas do edital com o perfil cadastrado da I9+, gerando veredito justificado e nota de fit (0 a 100).
3. **Assistente de Chat por Edital (\`ChatServico\`):** Interface conversacional onde o usuário pode tirar dúvidas específicas sobre o edital, localizando trechos e páginas de evidência.

### 2.1. Modo A: Ollama Local (Padrão e Recomendado)

No modo local, o processamento ocorre no próprio hardware da máquina ou servidor.

- **Tecnologia:** Ollama HTTP REST API (\`/api/generate\` e \`/api/chat\`).
- **Modelo Homologado:** \`gemma2:latest\` (Gemma 2 9B parâmetros).
- **Parâmetros no Sistema (tabela \`config\`):**
  - \`ollama_modo\`: \`LOCAL\`
  - \`ollama_url\`: \`http://localhost:11434\` (ou o IP do servidor Ollama na rede)

#### Como Configurar:
1. Instale o Ollama via terminal ou instalador oficial (\`https://ollama.com\`).
2. Faça o download do modelo:
   \`\`\`bash
   ollama pull gemma2:latest
   \`\`\`
3. Garanta que o serviço está rodando (\`ollama serve\`).
4. Na interface web do sistema, acesse \`Configurações › Inteligência Artificial\`.
5. Selecione **"Neste computador (Ollama)"**, confirme a URL e clique em **Salvar alterações**.
6. O painel exibirá o indicador verde com a versão do Ollama e a confirmação de disponibilidade do modelo.

### 2.2. Modo B: Ollama Cloud (Nuvem)

Ideal para computadores sem GPU ou ambientes de demonstração rápida.

- **Tecnologia:** Endpoint seguro da API Ollama Cloud com autenticação via token Bearer.
- **Parâmetros no Sistema (tabela \`config\`):**
  - \`ollama_modo\`: \`NUVEM\`
  - \`ollama_chave\`: Chave de API pessoal obtida no painel Ollama (\`https://ollama.com/settings/keys\`).
  - \`ollama_modelo_nuvem\`: Nome do modelo na nuvem (ex: \`gemma2:latest\` ou modelo homologado).

#### Como Configurar:
1. Crie uma conta em [ollama.com](https://ollama.com) e gere sua chave de acesso em **Settings › Keys**.
2. No sistema, acesse \`Configurações › Inteligência Artificial\`.
3. Selecione a opção **"Na nuvem (Ollama Cloud)"**.
4. Cole sua **Chave de API** e confirme o modelo desejado.
5. Clique em **Testar e Salvar**.

### 2.3. Resiliência e Retentativas da IA
Se a IA estiver temporariamente indisponível:
- O sistema registra o status \`FALHA\` com o motivo no histórico do edital.
- Uma rotina automática reexecuta o processamento a cada 15 minutos (até 3 tentativas).
- Após 3 falhas consecutivas, o edital é encaminhado para \`EM_REVISAO\` com alerta visível para a equipe.

---

## 3. Integração 2: Banco de Dados

O sistema possui uma camada agnóstica de banco de dados (\`src/server/db\`), permitindo alternar dinamicamente entre base local em arquivo e base colaborativa em nuvem sem reiniciar o servidor.

### 3.1. Modo Local: SQLite Embutido (\`node:sqlite\`)
- **Arquivo de dados:** \`data/editais.db\` (armazenado localmente).
- **Driver:** Módulo nativo \`node:sqlite\` do Node.js v24+, sem dependência de binários compilados em C++.
- **Esquema:** Declarado em \`db/schema.sql\` (tabelas: \`usuarios\`, \`editais\`, \`fontes\`, \`alertas\`, \`destinatarios\`, \`perfil\`, \`criterios\`, \`config\`).
- **Segurança de Dados:**
  - Backups automáticos gerados a cada importação em \`data/backups/\`.
  - Comando de exportação para compartilhamento:
    \`\`\`bash
    npm run db:exportar
    \`\`\`
    Gera um snapshot compactado em \`exportacoes/editais-AAAA-MM-DD_HHMM.db\`.
  - Comando de importação:
    \`\`\`bash
    npm run db:importar -- caminho/base.db
    \`\`\`

### 3.2. Modo Nuvem: Turso (LibSQL Distribuído)
Permite que múltiplos computadores da I9+ compartilhem a mesma base ao vivo, com replicação e latência de milissegundos.

- **Tecnologia:** Protocolo LibSQL sobre WebSocket/HTTPS (\`@libsql/client\`).
- **Configuração:** Armazenada em \`data/base-conexao.json\` (mantida fora do controle de versão Git).
- **Passo a Passo de Integração:**
  1. Crie uma base de dados gratuita ou corporativa em [turso.tech](https://turso.tech).
  2. Obtenha a **Database URL** (\`libsql://nome-da-sua-base.turso.io\`) e crie um **Auth Token** com permissões de leitura/escrita.
  3. No sistema, acesse \`Configurações › Base de dados\`.
  4. Selecione **"Na nuvem (Turso)"**, preencha a URL e o Token.
  5. Clique em **Testar conexão**.
  6. Caso a base esteja vazia, você pode optar por enviar os dados locais atuais para a nuvem.
  7. Clique em **Usar a base na nuvem**. A partir deste instante, todos os usuários conectados compartilham os mesmos dados em tempo real.

---

## 4. Integração 3: Notificações por E-mail (SMTP)

O envio de alertas automáticos utiliza o protocolo **SMTP** padrão da internet através da biblioteca \`nodemailer\`.

### 4.1. Provedores Suportados e Recomendações

1. **Google Workspace / Gmail:**
   - **Servidor:** \`smtp.gmail.com\`
   - **Porta:** \`465\` (com SSL ativo) ou \`587\` (com TLS/STARTTLS)
   - **Autenticação:** O Google exige **Verificação em 2 etapas** ativada e a criação de uma **Senha de Aplicativo** (*App Password*) em \`myaccount.google.com/apppasswords\`. **Nunca utilize sua senha pessoal do e-mail**.
2. **Microsoft 365 / Outlook:**
   - **Servidor:** \`smtp.office365.com\`
   - **Porta:** \`587\` (TLS ativo)
   - **Usuário:** e-mail institucional completo da I9+.
3. **Servidor SMTP Corporativo Interno (Postfix / Sendmail / Exchange):**
   - **Servidor:** IP interno ou hostname
   - **Porta:** \`25\` ou \`587\`.

### 4.2. Modo Sandbox (Terminal)
Quando os campos de SMTP não estão configurados, o sistema ativa automaticamente o adaptador \`ConsoleAdaptador\`, imprimindo o conteúdo completo do e-mail no terminal do servidor com cabeçalhos e destinatários.

### 4.3. Teste Rápido de Envio
Para validar a integração diretamente via linha de comando:
\`\`\`bash
npm run email:teste -- seu-email@i9mais.com.br
\`\`\`

---

## 5. Integração 4: Portais de Editais e Fontes de Coleta

O motor de coleta periódica (\`ColetaServico\`) suporta diferentes naturezas de integração:

### 5.1. Integração via API REST (FINEP)
- **Fonte Padrão Integrada:** Financiadora de Estudos e Projetos (FINEP).
- **Mecanismo:** Chamadas diretas para a API pública de chamadas abertas da FINEP.
- **Vantagens:** Alta velocidade, zero risco de quebra por alteração visual e metadados estruturados.

### 5.2. Integração por Páginas Web Estáticas (HTML)
- **Tecnologia:** Requisições HTTP com parsing de DOM via \`cheerio\`.
- **Funcionamento:** O robô acessa a URL configurada, extrai listas de links ancorados em seletores CSS ou padrões de texto e identifica links de novos editais.

### 5.3. Integração por Páginas Web Dinâmicas (JavaScript / SPAs)
- **Tecnologia:** Motor **Playwright Chromium** headless.
- **Funcionamento:** Portais que montam a lista de editais dinamicamente via AJAX/JavaScript são abertos em um navegador invisível, aguardando a hidratação completa da tabela antes de extrair os links.
- **Instalação dos binários:**
  \`\`\`bash
  npx playwright install chromium
  \`\`\`

### 5.4. Deduplicação e Detecção de Retificações
- O sistema gera um hash unívoco para cada edital a partir do título normalizado e link original.
- Se um edital já existente sofrer alteração de texto ou nova publicação de errata na mesma URL, o sistema identifica a mudança e dispara o alerta **E05 (Edital Retificado)**.
`,
}

export const manualConfiguracao: ManualInfo = {
  id: 'configuracao',
  titulo: 'Manual de Configurações de Parâmetros',
  subtitulo: 'Guia completo explicando o impacto operacional de cada campo do sistema',
  nomeArquivo: 'MANUAL-DE-CONFIGURACOES.md',
  conteudo: `# Manual de Configurações de Parâmetros do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Administradores do sistema, analistas de negócios e gestores de projetos da I9+.  
> **Objetivo:** Explicar detalhadamente cada parâmetro, campo configurável e regra do sistema, demonstrando como suas alterações impactam diretamente a coleta, a análise por IA, os cálculos de notas e o envio de alertas.

---

## 1. Visão Geral da Central de Configurações

O menu **Configurações** (\`/configuracoes\`) centraliza todas as variáveis operacionais e estratégicas da aplicação. 

**Todas as alterações realizadas nesta tela são gravadas no banco de dados e entram em vigor imediatamente**, sem derrubar o servidor ou desconectar os usuários.

A central está estruturada em quatro grandes eixos:
1. **Empresa:** Perfil da I9+ e Critérios com Pesos de Avaliação.
2. **Coleta:** Fontes e Portais de Editais Monitorados.
3. **Notificações:** Alertas (E01 a E06), Lista de Destinatários e Servidor SMTP de E-mail.
4. **Sistema:** Parâmetros de Inteligência Artificial e Gerenciamento da Base de Dados.

---

## 2. Eixo Empresa: Perfil da I9+ (\`Configurações › Perfil\`)

O perfil corporativo representa a "identidade estratégica" da I9+ dentro do motor de decisão. A IA e o motor de critérios utilizam estes campos para verificar se a empresa cumpre os requisitos de participação de cada edital.

| Campo | O que representa | Impacto direto no funcionamento da aplicação |
| :--- | :--- | :--- |
| **Razão Social e Nome Fantasia** | Identificação cadastral oficial da empresa. | Utilizado em relatórios gerados, resumos executivos e na saudação dos alertas automáticos. |
| **CNPJ** | Número do Cadastro Nacional de Pessoa Jurídica. | **Campo Crítico:** Se o CNPJ estiver em branco ou zerado, o processamento de novos editais fica retido em status \`COLETADO\` com aviso de pendência cadastral. |
| **Porte da Empresa** | Microempresa (ME), Empresa de Pequeno Porte (EPP), Média ou Grande Empresa. | **Campo de Alta Sensibilidade:** Inúmeros editais de inovação são exclusivos para micro ou pequenas empresas. Se a I9+ estiver configurada como "Pequena Empresa" e o edital exigir "Média/Grande", o critério eliminatório reprova o edital imediatamente como **Não Elegível (Fit 0)**. |
| **Faturamento Anual (R$)** | Receita bruta contábil do último exercício fiscal. | Comparado com o teto de faturamento estipulado pelo edital. Também define o valor máximo de subvenção que a empresa tem capacidade de pleitear sem violar regras de alavancagem financeira. |
| **CNAE Principal e Secundários** | Códigos Nacionais de Atividade Econômica. | Utilizado pela IA para atestar compatibilidade de objeto social. Se um edital exigir atuação exclusiva em outro setor e o CNAE for divergente, a IA gera apontamento de risco ou reprovação. |
| **Setor de Atuação e Especialidades** | Áreas em que a I9+ atua (ex: Software, IA, Transformação Digital, Indústria 4.0). | Alimenta o vetor semântico de aderência temático da IA, pontuando os editais focados nessas verticais. |
| **Localização (UF e Município)** | Estado da federação e município da sede da empresa. | Impacta editais de Fundações Estaduais de Amparo à Pesquisa (FAPs). Editais restritos a outros estados são classificados como não elegíveis para a I9+. |
| **Histórico de Fomento e Projetos Anteriores** | Relação de projetos já executados com recursos públicos ou privados. | Pontua positivamente nos critérios de experiência prévia da empresa, elevando a Nota de Fit. |
| **Certificações (ISO, CMMI, etc.)** | Títulos de conformidade e qualidade técnica. | Editais que bonificam certificações internacionais utilizam este campo para conceder pontuação extra no cômputo do fit. |

---

## 3. Eixo Empresa: Critérios e Pesos (\`Configurações › Critérios\`)

O motor de decisão (\`motorCriterios.ts\`) executa duas operações matemáticas a cada novo edital:
1. **Validação de Eliminatórias:** Se reprovado em qualquer regra eliminatória, o edital recebe **Fit 0 (Não Elegível)** e não avança para o pipeline prioritário.
2. **Ponderação de Pontuáveis:** Soma ponderada dos critérios aprovados que resulta em uma nota de **0 a 100**.

### 3.1. Campos Disponíveis para Criação de Critérios

- \`porte_empresa\`: Avalia se o porte da I9+ atende ao público-alvo do edital.
- \`contrapartida_minima\`: Percentual de contrapartida financeira exigida.
- \`valor_financiamento\`: Faixa orçamentária do projeto (mínimo e máximo).
- \`prazo_execucao\`: Duração máxima do projeto em meses.
- \`exige_ict_parceira\`: Se é obrigatório firmar parceria com Universidade/Instituto de Pesquisa.
- \`area_tematica\`: Alinhamento das áreas de pesquisa com as competências da I9+.

### 3.2. Operadores Lógicos Suportados
- **Igual a (\`=\`) / Diferente de (\`!=\`)**: Checagens categóricas exatas.
- **Maior que (\`>\`) / Menor que (\`<\`)**: Checagens de valores numéricos de orçamento, prazos ou contrapartidas.
- **Maior ou igual (\`>=\`) / Menor ou igual (\`<=\`)**: Faixas inclusivas.
- **Contém (\`contem\`)**: Busca textual dentro de exigências ou descrições do edital.
- **Está na lista (\`em_lista\`)**: Comparações com múltiplos valores possíveis.

### 3.3. Configuração de Pesos e Impacto na Classificação

Cada critério pontuável recebe um peso de **1 a 5**. A nota final categoriza o edital nas seguintes faixas:

| Faixa de Nota | Classificação | Cor Visual | Impacto no Sistema |
| :---: | :---: | :---: | :--- |
| **70 a 100** | **Alto Fit** | Verde | Destaque no topo do Dashboard, inclusão no bloco "Top Fit" e disparo imediato do **Alerta E01**. |
| **40 a 69** | **Médio Fit** | Amarelo | Edital viável sob análise prévia. |
| **1 a 39** | **Baixo Fit** | Cinza | Baixa aderência às prioridades atuais da empresa. |
| **0** | **Não Elegível** | Vermelho | Reprovado por restrição legal ou territorial. Impede submissão sem justificativa manual. |

---

## 4. Eixo Coleta: Fontes Monitoradas (\`Configurações › Fontes\`)

Gerencia quais portais oficiais são vasculhados periodicamente em busca de novas oportunidades.

| Campo | Opções / Formato | Impacto no Sistema |
| :--- | :--- | :--- |
| **Nome da Fonte** | Texto livre (ex: "FINEP Chamadas Públicas") | Identifica a procedência do edital na listagem, no dashboard e no histórico. |
| **URL Base** | Endereço web completo | Ponto de entrada que o robô de coleta acessa para iniciar a varredura. |
| **Tipo de Coleta** | \`API\`, \`HTML\` ou \`PAGINA_JS\` | **Define o motor de execução:**<br>• \`API\`: Chamada JSON de alta velocidade sem carregar interface gráfica.<br>• \`HTML\`: Download rápido via HTTP e parsing de tags com \`cheerio\`<br>• \`PAGINA_JS\`: Inicia o navegador invisível **Playwright (Chromium)**. |
| **Periodicidade** | Minutos / Horas (padrão: 60 min) | Intervalo de tempo entre as execuções automáticas do agendador. |
| **Seletor CSS / Padrão**| Expressão CSS | Localizador dos links dos editais dentro da página HTML. |
| **Ativa / Pausada** | Alternador (Toggle) | Quando desativada, o sistema interrompe as varreduras nessa fonte sem apagar os editais já coletados anteriormente. |

---

## 5. Eixo Notificações: Alertas (\`Configurações › Alertas\`)

1. **Alerta E01 — Novo Edital com Alto Fit:** Dispara imediatamente quando a nota alcançada é maior ou igual ao limiar configurado (padrão: 70 pontos).
2. **Alerta E02 — Prazo Próximo:** Notifica com antecedência de dias configurável (ex: 5 e 2 dias antes do encerramento das submissões).
3. **Alerta E03 — Verificação Necessária:** Dispara quando a IA detecta inconsistência ou quando o edital é movido para \`EM_REVISAO\`.
4. **Alerta E04 — Resumo Semanal:** Consolida um boletim executivo com os editais abertos e prazos da semana.
5. **Alerta E05 — Edital Retificado:** Monitora editais cadastrados e avisa quando há publicação de nova errata ou prorrogação de cronograma.
6. **Alerta E06 — Falha na Coleta:** Alerta administrativo caso uma fonte fique fora do ar por mais de 3 tentativas consecutivas.

---

## 6. Eixo Notificações: Destinatários e E-mail (\`Configurações › Destinatários e E-mail\`)

- **Destinatários:** Cadastro de membros da equipe com associação granular a cada tipo de alerta (E01 a E06).
- **Servidor SMTP (E-mail):** \`smtp_host\`, \`smtp_porta\`, \`smtp_usuario\`, \`smtp_senha\`, \`smtp_nome_remetente\`. Se \`smtp_host\` estiver vazio, os e-mails são impressos no terminal de log (modo sandbox).

---

## 7. Eixo Sistema: Inteligência Artificial (\`Configurações › IA\`)

- **Modo de Operação:** \`LOCAL\` (Ollama nesta máquina/servidor) ou \`NUVEM\` (Ollama Cloud).
- **URL do Ollama:** Padrão \`http://localhost:11434\`.
- **Chave de API (Nuvem):** Token secreto para Ollama Cloud.
- **Modelo Selecionado:** Padrão \`gemma2:latest\`.
- **Limite Diário de Chat:** Quantidade máxima de mensagens por usuário ao dia (padrão: 20).

---

## 8. Eixo Sistema: Base de Dados (\`Configurações › Base\`)

- **Modo da Base:** \`LOCAL\` (arquivo \`data/editais.db\`) ou \`NUVEM\` (Turso distribuído).
- **URL do Turso e Auth Token:** Credenciais para conexão compartilhada em tempo real com toda a equipe.
- **Baixar Base (Exportar):** Gera snapshot seguro \`.db\`.
- **Importar Base:** Substitui com backup de segurança automático em \`data/backups/\`.
`,
}

export const manuaisLista: ManualInfo[] = [manualUso, manualIntegracao, manualConfiguracao]
