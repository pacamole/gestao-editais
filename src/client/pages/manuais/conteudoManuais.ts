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
  subtitulo: 'Fluxo em 2 etapas (Triagem e Análise Profunda), Chat assistido e requisitos de hardware',
  nomeArquivo: 'MANUAL-DE-USO.md',
  conteudo: `# Documentação de Uso do Sistema — Gestor de Editais I9+

> **Público-alvo:** Equipe técnica, administradores de TI e gestores de inovação da I9+.  
> **Objetivo:** Orientar sobre o uso do sistema, o fluxo completo de avaliação de editais (Triagem, Análise Profunda e Chat), requisitos computacionais para execução de IA (LLM) localmente e requisitos para hospedagem e implantação em servidor corporativo.

---

## 1. Visão Geral do Sistema e Fluxo de Avaliação dos Editais

O **Gestor de Editais I9+** foi concebido para transformar o processo de captação de recursos públicos e privados de fomento na **I9+**. Ele monitora fontes oficiais (FINEP, EMBRAPII, FAPs estaduais e ministérios), analisa automaticamente a documentação em PDF via Inteligência Artificial, avalia a elegibilidade e a aderência estratégica da empresa (calculando a Nota de Fit) e avisa a equipe antes que os prazos expirem.

### 🔄 Como Funciona a Avaliação em Duas Etapas e o Chat Interativo:

A avaliação de cada oportunidade segue um fluxo inteligente e seguro dividido em duas etapas principais e uma etapa intermediária assistida:

* **1ª ETAPA: TRIAGEM DE ELEGIBILIDADE**
  * Verifica se a I9+ pode participar antes de gastar tempo ou processamento.
  * Compara o perfil da empresa com a leitura de até 10 páginas do site da I9+.
  * Se INELIGÍVEL: encerra aqui (economiza tempo e recursos).
  * Se ELEGÍVEL: calcula a nota de fit e libera a próxima fase.
* **2ª ETAPA: FAZER ANÁLISE PROFUNDA**
  * Disparada pelo botão **"Fazer análise profunda"**.
  * Extrai todos os dados do edital em PDF e recalcula a elegibilidade considerando os critérios eliminatórios e a triagem anterior.
* **ETAPA INTERMEDIÁRIA: CHAT COM CORREÇÕES ASSISTIDAS**
  * Tire dúvidas pontuais sobre o documento em linguagem natural.
  * A IA sugere correções com evidências do edital.
  * Para sua segurança, você seleciona quais sugestões aceita e clica em **"Autorizar e salvar selecionados"**.

---

### Detalhamento das Etapas Operacionais:

#### 1. Triagem (1ª Etapa — Avaliação Inicial de Elegibilidade):
* **O que é:** É o processo de avaliação inicial que determina se a I9+ tem condições básicas de participar do edital.
* **Como funciona:** 
  * Para editais novos captados pelas fontes, a triagem é executada de forma **automática**.
  * Em editais já cadastrados, você pode dispará-la a qualquer momento clicando no botão **"Analisar elegibilidade"**.
* **O que a IA faz:** A IA formula os requisitos do edital em forma de perguntas e responde a si mesma comparando os dados do perfil da empresa com o conteúdo público do site da I9+ (a leitura percorre até **10 páginas internas mais relevantes do domínio**, limitada a **30.000 caracteres**).
* **Importante:** A pontuação de critérios e pesos (Nota de Fit de 0 a 100) **só é calculada quando a triagem considera o edital elegível**, evitando que a equipe perca tempo pontuando editais dos quais a empresa não pode participar!

#### 2. Análise Profunda (2ª Etapa de Extração Completa):
* Na tela de detalhes do edital, o botão principal agora se chama **"Fazer análise profunda"** (antigo "Ler edital com IA").
* Ao clicar nele, o sistema realiza a leitura exaustiva de todas as páginas do PDF do edital, extrai valores, contrapartidas, datas e obrigações.
* Após a extração, o sistema **recalcula a elegibilidade** combinando o resultado da triagem anterior com todos os critérios eliminatórios configurados.

#### 3. Chat com Correções Assistidas (Etapa Intermediária):
* No painel lateral do edital, você pode conversar com a IA em linguagem natural para tirar qualquer dúvida sobre regras, anexos ou cláusulas.
* Se durante a conversa você notar ou a IA identificar que algum campo do edital foi preenchido incorretamente, **a IA pode sugerir correções com as evidências exatas do texto do edital**.
* **Segurança total:** As sugestões vêm **desmarcadas por padrão**. Nenhum dado é alterado no banco de dados sem a sua autorização! Você confere as sugestões, marca as caixinhas que concorda e clica no botão **"Autorizar e salvar selecionados"**.

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
5. No Gestor de Editais I9+, acesse \`Configurações › Inteligência Artificial\` e confirme se o status exibe **"Conectado ao Ollama local"**.

---

## 3. Requisitos Computacionais para Hospedagem em Servidor

O Gestor de Editais I9+ foi arquitetado em **Node.js (Express + TypeScript)** integrado a banco de dados relacional (SQLite nativo ou Turso na nuvem) e um navegador invisível (**Playwright Chromium**) para raspagem de páginas dinâmicas.

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
  subtitulo: 'O que são, como adicionar novas integrações e cuidados com fontes manuais',
  nomeArquivo: 'MANUAL-DE-INTEGRACOES.md',
  conteudo: `# Manual de Integrações do Sistema — Gestor de Editais I9+

> **Para quem é este manual:** Para qualquer membro da equipe da I9+, gestores de inovação e administradores que precisam entender como o sistema conversa com outros serviços, como ligar novas fontes de editais e quais cuidados tomar no dia a dia.  
> **Linguagem:** Clara, prática e sem termos técnicos desnecessários.

---

## 1. O que são as "Integrações" do Sistema?

Pense no **Gestor de Editais** como uma central de trabalho inteligente na I9+. Sozinho, ele já consegue guardar informações. Mas para não dar trabalho para ninguém ficar caçando editais na internet o dia todo ou lendo documentos de 80 páginas linha por linha, o sistema constrói **"pontes" automáticas** com outros serviços e plataformas.

Essas pontes são as **integrações**. No sistema, elas estão divididas em 4 pilares práticos:

* **1. Inteligência Artificial (O nosso Leitor e Assistente):**  
  Conecta o sistema aos modelos de linguagem (locais ou em nuvem). A IA atua na triagem inicial dos editais, lê os documentos em PDF, extrai dados cruciais (valores, prazos, exigências de contrapartida), compara com as páginas do site da I9+ e atende você no chat interativo de cada edital.
* **2. Base de Dados Compartilhada (A Memória da Empresa):**  
  Conecta o sistema a um banco de dados centralizado na nuvem (Turso). Dessa forma, quando alguém cadastra ou revisa um edital, todos os outros computadores da equipe da I9+ veem a informação atualizada no mesmo segundo.
* **3. Serviço de E-mail (O Mensageiro):**  
  Conecta o sistema ao servidor de e-mail institucional (como Gmail ou Outlook) para disparar avisos automáticos: quando surge um edital de alto fit, quando os prazos de submissão estão perto do fim ou quando um edital sofreu retificação.
* **4. Fontes e Portais de Editais (Os Rastreadores):**  
  Conecta o sistema aos portais oficiais de fomento (como a API direta da FINEP e páginas de chamadas públicas). Os robôs visitam esses sites todos os dias no horário programado para coletar e cadastrar novas oportunidades automaticamente.

---

## 2. Como os Usuários Podem Adicionar Mais Integrações?

Você não precisa mexer em linhas de código para adicionar ou configurar essas integrações. Tudo é feito por telas simples no menu **Configurações**.

---

### A) Adicionando uma Nova Fonte de Coleta de Editais

Quer que o sistema comece a vigiar um novo portal de editais da internet (por exemplo, um portal estadual de inovação ou ministério)?

1. No menu lateral esquerdo, clique em **Configurações › Fontes monitoradas**.
2. No topo da tela, clique no botão azul **"+ Adicionar fonte"**.
3. Na janela que se abrir, preencha:
   - **Nome da fonte:** Um nome fácil de reconhecer (ex: \`FAPESP - Chamadas Vigentes\` ou \`EMBRAPII Editais\`).
   - **Endereço do site (URL):** Cole o link da página onde fica a lista de editais abertos (ex: \`https://fapesp.br/chamadas\`).
   - **Horário da visita:** Escolha a hora em que o robô deve passar lá todo dia (ex: \`06:30\` da manhã).
4. Clique no botão **"Verificar endereço"**:
   - O sistema vai dar uma espiada no site na hora para confirmar se consegue ler a página e se achou editais lá dentro.
5. Se der tudo certo, clique em **"Salvar fonte"**.
6. **Quer testar na mesma hora?** Na tabela de fontes, vá na linha da fonte que você acabou de criar, clique no menu de três pontinhos \`...\` e escolha **"Buscar agora"**. O sistema fará a varredura naquele instante!

---

### B) Conectando o E-mail da I9+ para Envio de Alertas

Para o sistema conseguir enviar e-mails de aviso para a equipe:

1. Acesse **Configurações › E-mail (SMTP)**.
2. No campo **Provedor**, escolha o que a sua empresa usa: \`Gmail\`, \`Outlook\` ou \`Outro\`.
3. Digite o e-mail remetente (ex: \`projetos@i9mais.com.br\`).
4. **Senha de aplicativo:** Se for Gmail ou Outlook com autenticação de duas etapas, você deve gerar uma "Senha de aplicativo" na sua conta de e-mail e colar aqui (nunca use a sua senha pessoal do dia a dia!).
5. Em **Nome do remetente**, escreva como o e-mail deve chegar na caixa das pessoas (ex: \`Editais I9+\`).
6. Clique em **"Salvar configuração de e-mail"**.
7. Logo abaixo, no bloco de teste, digite o seu próprio e-mail e clique em **"Enviar e-mail de teste"**. Se a mensagem apitar na sua caixa de entrada, a integração está perfeita!

---

### C) Conectando a Base de Dados na Nuvem (Turso)

Se você quer que tudo o que você cadastre apareça automaticamente no computador dos seus colegas de equipe:

1. Acesse **Configurações › Base de dados**.
2. Em **Onde ficam os dados**, marque **"Na nuvem (Turso)"**.
3. Cole o **Endereço do banco** (que começa com \`libsql://...\`) e a **Chave de acesso (Token)** fornecidos pelo administrador.
4. Clique em **"Testar conexão"**.
5. Se aparecer a mensagem verde de sucesso, clique em **"Usar a base na nuvem"**. Pronto: a partir de agora todo mundo trabalha na mesma base compartilhada!

---

### D) Alternando a Inteligência Artificial (Computador vs. Nuvem)

1. Acesse **Configurações › Inteligência artificial**.
2. Se você tem um computador forte com placa de vídeo, escolha **"Neste computador (Ollama)"**.
3. Se você está em um notebook mais modesto ou prefere não instalar nada pesado, escolha **"Ollama Cloud"**, cole a chave de acesso que a equipe possui e clique em **"Salvar"**.

---

## 3. As Implicações de Adicionar uma Nova Fonte Manualmente (E por que isso pode falhar)

A equipe precisa saber com total transparência: **adicionar uma nova fonte de internet para o robô vigiar automaticamente é muito útil, mas é um processo que pode falhar com facilidade**.

Entenda abaixo por que isso acontece e quais são os cuidados obrigatórios:

### ⚠️ Por que fontes manuais falham com tanta frequência na internet?

1. **Os sites do governo e portais mudam de visual do nada:**
   - O robô aprendeu a procurar editais num botão azul com texto "Baixar Edital". Se amanhã o desenvolvedor do portal mudar o site e colocar uma tabela diferente ou um menu suspenso, o robô fica "cego" e não encontra mais os links.
2. **Páginas que demoram para carregar (feitas em JavaScript moderno):**
   - Alguns portais abrem uma tela em branco e demoram 3 a 5 segundos puxando as informações de outro lugar. Se a conexão oscilar ou o site estiver lento, o robô tenta ler antes da hora e acha que a página está vazia.
3. **Bloqueios de segurança e "Não sou um robô" (CAPTCHA):**
   - Vários portais públicos possuem proteção contra robôs (como Cloudflare ou telas com fotos para clicar em semáforos). Como o nosso sistema é um robô automático de madrugada, ele é barrado na porta e não consegue entrar.
4. **Colocar o link errado:**
   - **Erro mais comum:** a pessoa clica no edital número 05/2026, copia o link direto daquele edital e cadastra como fonte. O robô só vai ver aquele mesmo edital para sempre e nunca vai achar novos! A fonte precisa ser a **página geral de listagem**, onde todos os editais novos são publicados.
5. **Portais que exigem pesquisa ou preencher formulário:**
   - Se o site só mostra editais depois que você escolhe "Ano 2026" e clica em "Filtrar", o robô padrão não consegue adivinhar o que preencher e não vê nada.

---

### 🚦 O que acontece no sistema quando uma fonte falha?

* Na tela de **Fontes monitoradas**, a fonte passará a exibir uma etiqueta amarela **"Com avisos"** ou vermelha **"Com erro"**.
* O sistema não trava o resto do programa! Ele simplesmente anota o erro no histórico e tenta de novo no dia seguinte.
* Se a fonte continuar falhando por 3 dias seguidos, o sistema dispara o **Alerta E06 (Falha na Coleta)** para o e-mail dos responsáveis técnicos para avisar que o site mudou ou caiu.

---

### 🛡️ A Alternativa Recomendada (À prova de falhas)

Quando um portal de editais for muito complicado, tiver senhas ou o robô não conseguir ler de jeito nenhum, **não se preocupe!** O sistema tem uma porta de entrada manual 100% garantida:

1. Vá no menu principal e clique em **"Nova entrada"** (\`/editais/novo\`).
2. Você tem duas opções super fáceis:
   - **Por Link (URL):** Basta colar o link direto da página daquele edital específico e clicar em "Adicionar edital".
   - **Por Envio de PDF:** Baixe o arquivo PDF do edital no seu computador, arraste para dentro da tela e clique em "Enviar edital".
3. A Inteligência Artificial vai ler o documento com a mesma qualidade e você não corre nenhum risco de o robô da internet falhar!
`,
}

export const manualConfiguracao: ManualInfo = {
  id: 'configuracao',
  titulo: 'Manual de Configurações de Parâmetros',
  subtitulo: 'Passo a passo com caso real da I9+ ensinando como cadastrar cada item do sistema',
  nomeArquivo: 'MANUAL-DE-CONFIGURACOES.md',
  conteudo: `# Manual Prático de Configurações do Sistema — Gestor de Editais I9+

> **Para quem é este manual:** Para qualquer pessoa da equipe da I9+ que precise cadastrar ou ajustar as regras do sistema. Você não precisa saber nada de programação! Este guia foi feito como se um colega estivesse sentado ao seu lado, mostrando em quais botões clicar e explicando o porquê de cada campo.

---

## 1. O Nosso Caso Real de Exemplo (Para entender na prática)

Para ficar muito fácil de acompanhar, vamos seguir um **caso real da I9+** do começo ao fim:

* **Nossa Empresa:** \`I9+ Tecnologia e Inovação Ltda\`
* **Local:** Sede em \`Curitiba / PR\`.
* **Porte da Empresa:** \`EPP (Empresa de Pequeno Porte)\` / \`Média\`.
* **O que fazemos:** Projetos de Software, Inteligência Artificial e Automação de Processos.
* **O nosso objetivo:** Queremos que o sistema ache editais da **FINEP, FAPESP, EMBRAPII e Fundação Araucária** voltados para inovação e tecnologia, com valores entre **R$ 300 mil e R$ 2,5 milhões**, nos quais a I9+ não precise colocar mais do que **20% de contrapartida**.
* **Nossa equipe:**
  * **Ana (Comercial / Captação):** precisa receber um e-mail urgente assim que surgir um edital com nota alta (alto fit).
  * **Carlos (Técnico / Projetos):** precisa ser avisado quando faltarem poucos dias para o encerramento das inscrições.
  * **Lucas (TI / Suporte):** precisa ser avisado se algum site de editais cair ou parar de responder.

Vamos ver agora, passo a passo, em quais telas e botões você vai clicar para deixar tudo configurado para a I9+!

---

## 2. Passo 1: Cadastrando o Perfil da Empresa (A Identidade da I9+)

O primeiro passo é ensinar para o sistema quem é a I9+. É com base nesses dados que a Inteligência Artificial vai saber se a gente tem direito de concorrer a cada edital.

### Onde ir:
No menu lateral esquerdo, clique em **Configurações** e depois na opção **Perfil da empresa** (\`/configuracoes/perfil\`).

### O que fazer na tela (passo a passo dos campos):

1. **Razão social:** Digite \`I9+ Tecnologia e Inovação Ltda\`.
2. **Nome fantasia:** Digite \`I9+\`.
3. **CNPJ:** Digite o CNPJ da empresa (ex: \`12.345.678/0001-90\`).
   > ⚠️ **Atenção:** Nunca deixe o CNPJ em branco nem zerado! Se deixar vazio, o sistema bloqueia a análise dos editais novos por segurança, porque quase todo edital exige CNPJ válido.
4. **CNAE principal e secundários:**
   * No *CNAE principal*, coloque o código da atividade principal (ex: \`6201-5/01\` - Desenvolvimento de programas de computador sob encomenda).
   * Nos *CNAEs secundários*, coloque os outros códigos separados por vírgula (ex: \`6202-3/00, 6209-1/00\`).
   * *Para que serve isso?* A IA confere se o edital exige que a empresa tenha autorização formal para atuar naquela área.
5. **Porte da empresa (Caixa de seleção):**
   * Clique na caixinha e selecione **\`EPP\`** (ou \`Média\`, conforme o enquadramento atual da I9+).
   * *Por que isso é fundamental?* Muitos editais da FINEP e FAPESP são exclusivos para micro e pequenas empresas. Se você selecionar o porte correto, o sistema já elimina automaticamente editais que não aceitam o tamanho da I9+, poupando seu tempo!
6. **Estado (UF) e Município:**
   * No campo *Estado*, digite \`PR\` e em *Município* digite \`Curitiba\`.
   * *Para que serve?* Editais estaduais (como da Fundação Araucária do Paraná ou FAPESP de São Paulo) exigem sede no estado. O sistema usa isso para saber se a I9+ pode participar.
7. **Link da página da empresa (Novo campo com leitura automática de até 500 páginas):**
   * Informe o endereço público do site da I9+, começando obrigatoriamente com \`https://\` ou \`http://\` (ex: \`https://i9mais.com.br\`).
   * *Como a IA usa o site:* Na etapa de **Triagem de Elegibilidade**, o sistema valida a página inicial e tenta ler as páginas públicas do mesmo domínio através de links internos e sitemaps (rastreando até **500 páginas**). Em seguida, prioriza o conteúdo mais relevante (lendo até 10 páginas / 30.000 caracteres) para comparar a empresa com as exigências do edital!
   * *Importante:* A URL é validada ao clicar em salvar, e o site é lido automaticamente sempre que uma triagem é executada.
8. **Áreas de atuação e Palavras-chave:**
   * Em *Áreas de atuação*, digite: \`software, inteligencia artificial, transformacao digital, automacao\`.
   * Em *Palavras-chave*, digite termos que você quer encontrar: \`ia, deep learning, fomento a inovacao, subvencao economica\`.
9. **Capacidade de contrapartida (%):**
   * Digite \`20\`.
   * *Para que serve?* Se um edital exigir que a empresa pague 40% do projeto do próprio bolso, o sistema saberá que está acima da nossa capacidade habitual.
10. **Valor mínimo de interesse:**
    * Digite \`300000\` (R$ 300.000,00). Editais com verbas muito pequenas não serão destacados.
11. **Possui parceria com instituição de pesquisa (ICT):**
    * Se a I9+ tiver convênio ou parceria com universidades (ex: UTFPR, UFPR ou institutos de pesquisa), **marque esta caixinha**. Editais que exigem consórcio com universidade vão ganhar pontos extras.
12. **Instruções extras (Novo campo para enriquecer a análise da IA):**
    * Permite informar todo o contexto complementar que não cabe nos outros campos pré-definidos — por exemplo: uma experiência específica de mercado, uma tecnologia proprietária, premiações recebidas ou uma linha de pesquisa em andamento.
    * Exemplo real do que escrever:
      > *"A I9+ possui plataforma própria de processamento de linguagem natural e histórico comprovado em projetos de inteligência artificial aplicada ao setor corporativo e logístico. Não temos interesse em editais voltados exclusivamente para obras de infraestrutura física, agronegócio de lavoura ou aquisição de máquinas agrícolas pesadas."*
    * *Como a IA interpreta:* A IA utiliza esse texto como **informação complementar estratégica**. Ela ajuda a desempatar dúvidas de aderência temática, mas **não substitui os requisitos objetivos do edital** (como porte e regularidade fiscal).
13. **Finalizando e Salvando:**
    * Deixe marcada a opção **"Reavaliar todos os editais ativos com o novo perfil"**.
    * Clique no botão azul **"Salvar perfil"**. O sistema vai atualizar tudo e reavaliar os editais abertos na hora!

---

## 3. Passo 2: Configurando Critérios e Pesos (Como a IA dá a Nota de 0 a 100)

Agora que o sistema já conhece a I9+, vamos definir as **regras do jogo**: o que desclassifica um edital na hora e o que faz ele ganhar uma nota alta.

### Onde ir:
No menu lateral esquerdo, em **Configurações**, clique em **Critérios e pesos** (\`/configuracoes/criterios\`).

---

### Exemplo Prático A: Criando uma Regra Eliminatória (Porte da Empresa)
*Objetivo:* Se o edital não aceitar o nosso porte de empresa, ele deve ser reprovado na hora (ficando com etiqueta vermelha **Não elegível**).

1. No topo da página, clique no botão azul **"+ Novo critério"**.
2. Uma janelinha vai se abrir:
   * **Tipo do critério:** Selecione **"Eliminatório"** (isso significa: se reprovar aqui, está fora!).
   * **Nome do critério:** Digite \`Porte aceito pelo edital\`.
   * **Campo do edital:** Selecione na lista \`Porte aceito\`.
   * **Como comparar:** Escolha \`Lista contém\`.
   * **Comparar com:** Escolha a opção **"Campo do perfil da empresa"** e na caixinha selecione \`Porte\`.
   * **Mensagem de reprovação:** Digite \`O edital exige um porte empresarial diferente do cadastrado pela I9+\`.
3. Clique em **"Salvar critério"**. Pronto! Qualquer edital novo que chegar e exigir um porte que não é o nosso será descartado imediatamente.

---

### Exemplo Prático B: Ajustando os Pesos dos Critérios Pontuáveis (De 1 a 5)
*Objetivo:* Editais que tenham mais a ver com as nossas prioridades devem receber notas mais altas (de 0 a 100).

Na mesma tela, você verá a lista de critérios pontuáveis. Cada um tem um botão de peso de **1 (pouco importante) a 5 (super importante)**:

1. **Alinhamento com áreas de atuação:** Deixe com **Peso 5** (porque fazer projetos na nossa área de software/IA é a prioridade número 1).
2. **Valor financiado dentro do interesse:** Deixe com **Peso 4** (queremos projetos entre R$ 300 mil e R$ 2,5 milhões).
3. **Contrapartida exigida:** Deixe com **Peso 4** (se pedir menos de 20%, ganha nota máxima).
4. **Prazo de execução adequado:** Deixe com **Peso 3**.

> 💡 **Como interpretar as cores da nota final no sistema:**
> * **Verde (70 a 100 pontos):** É um edital de **Alto Fit**! Tem tudo a ver com a I9+ e dispara o alerta imediato para a equipe.
> * **Amarelo (40 a 69 pontos):** É um edital de **Médio Fit**. Vale a pena dar uma olhada, mas pode exigir alguma adaptação.
> * **Cinza (1 a 39 pontos):** **Baixo Fit**. Não tem muita prioridade para nós.
> * **Vermelho (0 pontos):** **Não Elegível**. Foi reprovado em alguma regra eliminatória ou na triagem inicial.

---

## 4. Passo 3: Cadastrando Fontes de Editais (Onde o Robô vai Procurar)

O sistema pode visitar portais de editais sozinho todo dia.

### Onde ir:
Clique em **Configurações › Fontes monitoradas** (\`/configuracoes/fontes\`).

### Como cadastrar a FINEP como exemplo prático:
1. Clique no botão **"+ Adicionar fonte"**.
2. Na janela:
   * **Nome:** Digite \`FINEP - Chamadas Públicas Abertas\`.
   * **Endereço do site (URL):** Cole \`http://www.finep.gov.br/chamadas-publicas\`.
   * **Horário:** Escolha \`06:00\` (o robô fará a varredura logo cedo).
3. Clique no botão **"Verificar endereço"** para o sistema conferir se a página abre normalmente.
4. Se der tudo certo, clique em **"Salvar fonte"**.
5. **Para testar na hora:** Vá na tabela de fontes, clique no botão de três pontinhos \`...\` ao lado da FINEP e escolha **"Buscar agora"**. O sistema vai rodar a busca naquele mesmo segundo!

---

## 5. Passo 4: Cadastrando a Equipe e Configurando os Alertas

Agora vamos cadastrar a **Ana**, o **Carlos** e o **Lucas** para que cada um receba os avisos certos no seu e-mail.

### A) Cadastrando os Destinatários:
1. No menu de configurações, clique em **Destinatários** (\`/configuracoes/destinatarios\`).
2. Clique em **"+ Novo destinatário"**:
   * Digite o nome: \`Ana - Captação\`.
   * Digite o e-mail: \`ana.comercial@i9mais.com.br\`.
   * Nos botõezinhos de alertas abaixo, marque:
     * \`E01 - Novo edital de alto fit\` (para ela correr e preparar a proposta comercial!).
     * \`E04 - Resumo semanal\` (para ver o balanço da semana na segunda de manhã).
   * Clique em **"Salvar"**.
3. Repita para o **Carlos**:
   * Nome: \`Carlos - Gerente de Projetos\`.
   * E-mail: \`carlos.projetos@i9mais.com.br\`.
   * Marque: \`E02 - Prazo de submissão próximo\` (para não deixar vencer o prazo) e \`E05 - Edital retificado\` (se houver prorrogação ou errata).
   * Clique em **"Salvar"**.
4. Repita para o **Lucas (TI)**:
   * Nome: \`Lucas - TI\`.
   * E-mail: \`lucas.suporte@i9mais.com.br\`.
   * Marque apenas: \`E06 - Falha na coleta\` (ele só é incomodado se algum site de editais cair ou quebrar).

---

### B) Configurando o Envio do E-mail (SMTP):
1. Clique na aba **E-mail (SMTP)** (\`/configuracoes/email\`).
2. Em **Provedor**, selecione \`Gmail\` (ou \`Outlook\`).
3. Em **E-mail de envio**, digite o e-mail da I9+ (ex: \`notificacoes@i9mais.com.br\`).
4. Em **Senha de aplicativo**, cole a senha de 16 letras gerada no painel de segurança do Google/Microsoft.
5. Em **Nome do remetente**, coloque \`Editais I9+\`.
6. Clique em **"Salvar configuração de e-mail"**.
7. No bloco abaixo de teste, digite o seu e-mail pessoal e clique no botão **"Enviar e-mail de teste"**. Assim que chegar na sua caixa de entrada, está 100% pronto!

---

## 6. Passo 5: Configurações de Inteligência Artificial e Compartilhamento

Para fechar com chave de ouro:

1. **Inteligência Artificial (\`Configurações › Inteligência artificial\`):**
   * Se você usa o modelo instalado no seu computador, deixe marcado **"Neste computador (Ollama)"**.
   * Se for usar pela nuvem, marque **"Ollama Cloud"** e cole a chave fornecida pela equipe.
   * Em **Limite diário de perguntas no chat**, deixe o padrão de \`20\` perguntas por usuário por dia (isso serve para ninguém sobrecarregar o processador do servidor à toa).
2. **Base de Dados (\`Configurações › Base de dados\`):**
   * Se você trabalha sozinho na máquina, pode deixar em **"Neste computador"**.
   * Se a equipe inteira da I9+ vai acessar o sistema ao mesmo tempo, marque **"Na nuvem (Turso)"**, cole o link e o token de acesso e clique em **"Usar a base na nuvem"**.
   * **Quer fazer uma cópia de segurança?** Basta clicar no botão **"Baixar base"** a qualquer momento e você terá um arquivo salvo com todos os dados da I9+ em segurança.
`,
}

export const manuaisLista: ManualInfo[] = [manualUso, manualIntegracao, manualConfiguracao]
