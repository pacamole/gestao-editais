# Documentação de Uso do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Equipe técnica, administradores de TI e gestores de inovação da I9+.  
> **Objetivo:** Orientar sobre o uso do sistema, requisitos computacionais para execução de Inteligência Artificial (LLM) localmente e requisitos para hospedagem e implantação em servidor corporativo.

---

## 1. Visão Geral do Sistema

O **Gestor Inteligente de Editais** foi concebido para transformar o processo de captação de recursos públicos e privados de fomento na **I9+**. Ele monitora fontes oficiais (FINEP, EMBRAPII, FAPs, ministérios, agências estaduais e plataformas de inovação), analisa automaticamente a documentação em PDF via Inteligência Artificial, avalia a elegibilidade e a aderência estratégica da empresa (calculando a Nota de Fit) e avisa a equipe por e-mail e painel antes que os prazos expirem.

### Principais Módulos Operacionais:
1. **Dashboard (`/`):** Visão executiva com totalizadores, editais urgentes (prazos nos próximos 7 dias), distribuição de classificação, editais de alto fit e integridade das fontes monitoradas.
2. **Editais (`/editais`):** Tabela analítica de oportunidades captadas, filtros avançados por relevância, status, faixa de fit, busca textual e ações em lote.
3. **Nova Entrada (`/editais/novo`):** Cadastro assistido de editais via envio de arquivo PDF, endereço web (URL) ou preenchimento manual completo.
4. **Detalhes do Edital (`/editais/:id`):** Dossiê completo do edital contendo justificativa da nota, avaliação de cada critério, dados extraídos do PDF, histórico de revisões e **Chat interativo com IA** para tirar dúvidas sobre o documento.
5. **Configurações (`/configuracoes`):** Gestão integrada de perfil da I9+, critérios de fit, fontes, alertas e integrações técnicas.
6. **Manuais (`/manuais`):** Central de documentação operacional, guias de integração e parâmetros do sistema.

---

## 2. Requisitos Computacionais para Usar LLM Localmente

O sistema integra-se ao framework **Ollama**, permitindo que modelos de linguagem de código aberto (LLMs) sejam executados inteiramente dentro da infraestrutura da I9+, garantindo **sigilo absoluto de dados corporativos e ausência de custos por token**.

O modelo padrão homologado para o sistema é o **`gemma2:latest`** (Gemma 2 9B), reconhecido pela alta capacidade de raciocínio em português brasileiro e interpretação precisa de termos jurídicos/editalícios.

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
   - O modelo `gemma2:latest` quantizado em 4 bits (Q4_K_M) ocupa aproximadamente **5,5 GB a 6,5 GB** de memória na inicialização.
   - Durante a leitura de um edital longo (PDFs de 40 a 100 páginas), o contexto da janela de atenção aloca memória adicional para o vetor de tokens.
   - Em máquinas sem GPU dedicada, a memória RAM do computador é compartilhada entre o modelo, o sistema operacional e o servidor da aplicação. Por isso, **16 GB é o piso mínimo absoluto**.
   - Em máquinas com GPU NVIDIA (com VRAM suficiente para carregar todas as camadas do modelo), a velocidade de geração salta de ~3 a 8 tokens/segundo para **35 a 65 tokens/segundo**.

2. **Apple Silicon (Mac Mini / MacBook / Mac Studio):**
   - Dispositivos Apple Silicon (M1/M2/M3/M4) utilizam arquitetura de **Memória Unificada**. Um Mac com **16 GB ou 24 GB de memória unificada** roda o modelo `gemma2:latest` com desempenho excelente, utilizando aceleração via Metal e Neural Engine.

3. **Alternativa em Máquinas Modestas (Ollama Cloud):**
   - Caso um membro da equipe esteja utilizando um notebook ou computador sem 16 GB de RAM ou sem placa de vídeo, não é necessário fazer upgrade de hardware. Basta ativar o modo **Ollama Cloud** em `Configurações › Inteligência Artificial`, inserindo uma chave de API do serviço em nuvem.

### 2.3. Instalação e Inicialização do Ollama

1. Baixe o instalador oficial em: [https://ollama.com](https://ollama.com).
2. Conclua a instalação e abra o terminal (PowerShell, Prompt ou Bash).
3. Baixe o modelo homologado:
   ```bash
   ollama pull gemma2:latest
   ```
4. Verifique se o serviço está ativo (por padrão o Ollama roda como serviço em segundo plano na porta 11434):
   ```bash
   ollama list
   ```
5. No Gestor de Editais, acesse `Configurações › Inteligência Artificial` e confirme se o status exibe **"Conectado ao Ollama local"**.

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
```bash
# Atualize os repositórios
sudo apt update && sudo apt upgrade -y

# Instale Node.js 24.x LTS e Git
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Verifique as versões
node -v    # Deve ser >= v24.0.0
npm -v
git -v
```

### 4.2. Clonagem e Preparação da Aplicação
```bash
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
```

### 4.3. Configuração do `.env` para o Servidor
Edite o arquivo `.env`:
```ini
# Endereço e porta em que o sistema escutará
PORT=3000
APP_URL=http://192.168.1.100:3000   # Substitua pelo IP do servidor ou domínio oficial

# Caminho do banco SQLite
DATABASE_PATH=data/editais.db

# Configurações iniciais do administrador
GESTOR_NOME=Administrador I9+
GESTOR_EMAIL=gestor@i9mais.com.br
GESTOR_SENHA=senha-forte-inicial
```

### 4.4. Inicialização do Banco de Dados e Build de Produção
```bash
# Criação do banco SQLite com o esquema estruturado
npm run db:reset

# Compilação dos bundles de front-end (Vite) e back-end (TypeScript)
npm run build
```

### 4.5. Execução Contínua via PM2 (Process Manager)
Para garantir que a aplicação reinicie automaticamente caso o servidor seja reiniciado:
```bash
# Instale o PM2 globalmente
sudo npm install -g pm2

# Inicie o servidor
pm2 start npm --name "gestao-editais" -- run start

# Configure o PM2 para inicializar no boot do Linux
pm2 startup
pm2 save
```

### 4.6. Configuração de Proxy Reverso com Nginx (Opcional, com HTTPS)
Para disponibilizar o sistema na porta 80 ou 443 com certificado SSL corporativo:
```nginx
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
```

---

## 5. Resolução de Dúvidas Frequentes

1. **A aplicação precisa de internet para funcionar?**  
   O núcleo do sistema funciona 100% offline em rede local caso seja utilizado Ollama local e banco SQLite. A internet é necessária apenas para:
   - Coletar novos editais nas fontes externas (FINEP, portais web);
   - Enviar notificações por e-mail externo (SMTP Gmail/Office365);
   - Acessar o banco na nuvem caso o modo Turso esteja ativo.

2. **Como atualizar a aplicação após novas versões do Git?**  
   No servidor, execute:
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart gestao-editais
   ```

3. **O que fazer se o processamento de um edital falhar?**  
   Verifique em `Configurações › Inteligência Artificial` se o Ollama está respondendo. O sistema realiza 3 tentativas automáticas com intervalo de 15 minutos. Se a falha persistir, o edital é movido para `EM_REVISAO`, permitindo que a equipe edite os dados manualmente sem perder nenhuma oportunidade.
