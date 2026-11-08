# Manual de Integrações do Sistema — Gestor Inteligente de Editais (I9+)

> **Público-alvo:** Desenvolvedores, arquitetos de software e administradores de sistemas.  
> **Objetivo:** Documentar detalhadamente a configuração, arquitetura e fluxo de funcionamento de todas as integrações externas e internas do sistema: Inteligência Artificial (Ollama / Ollama Cloud), Banco de Dados (SQLite / Turso na nuvem), Notificações por E-mail (SMTP) e Coleta de Editais (FINEP API, portais web e Playwright).

---

## 1. Visão Geral da Arquitetura de Integração

O Gestor de Editais adota o padrão de **Arquitetura em Camadas com Portas e Adaptadores (Hexagonal)**:
- **Controladores (`src/server/controllers`):** Recebem as chamadas HTTP da interface React.
- **Serviços (`src/server/servicos`):** Orquestram a regra de negócio sem acoplamento a bibliotecas externas.
- **Portas (`src/server/portas`):** Definem contratos TypeScript puros (`ModeloLinguagemPorta`, `EmailPorta`).
- **Adaptadores (`src/server/adaptadores`):** Implementam a comunicação real com ferramentas externas (Ollama, provedores SMTP, Turso, Playwright).

Dessa forma, trocar um serviço de nuvem ou atualizar uma integração não afeta as regras de negócio de elegibilidade ou avaliação da I9+.

---

## 2. Integração 1: Inteligência Artificial (LLM)

A Inteligência Artificial atua em três momentos cruciais:
1. **Extração de Dados dos Editais (`ExtracaoServico`):** Lê o texto bruto indexado do edital e extrai parâmetros estruturados (objeto, valores orçamentários, contrapartida, prazos, porte da empresa elegível, exigências de ICT).
2. **Avaliação Automatizada de Elegibilidade (`AvaliacaoServico`):** Compara as cláusulas do edital com o perfil cadastrado da I9+, gerando veredito justificado e nota de fit (0 a 100).
3. **Assistente de Chat por Edital (`ChatServico`):** Interface conversacional onde o usuário pode tirar dúvidas específicas sobre o edital, localizando trechos e páginas de evidência.

### 2.1. Modo A: Ollama Local (Padrão e Recomendado)

No modo local, o processamento ocorre no próprio hardware da máquina ou servidor.

- **Tecnologia:** Ollama HTTP REST API (`/api/generate` e `/api/chat`).
- **Modelo Homologado:** `gemma2:latest` (Gemma 2 9B parâmetros).
- **Parâmetros no Sistema (tabela `config`):**
  - `ollama_modo`: `LOCAL`
  - `ollama_url`: `http://localhost:11434` (ou o IP do servidor Ollama na rede)

#### Como Configurar:
1. Instale o Ollama via terminal ou instalador oficial (`https://ollama.com`).
2. Faça o download do modelo:
   ```bash
   ollama pull gemma2:latest
   ```
3. Garanta que o serviço está rodando (`ollama serve`).
4. Na interface web do sistema, acesse `Configurações › Inteligência Artificial`.
5. Selecione **"Neste computador (Ollama)"**, confirme a URL e clique em **Salvar alterações**.
6. O painel exibirá o indicador verde com a versão do Ollama e a confirmação de disponibilidade do modelo.

### 2.2. Modo B: Ollama Cloud (Nuvem)

Ideal para computadores sem GPU ou ambientes de demonstração rápida.

- **Tecnologia:** Endpoint seguro da API Ollama Cloud com autenticação via token Bearer.
- **Parâmetros no Sistema (tabela `config`):**
  - `ollama_modo`: `NUVEM`
  - `ollama_chave`: Chave de API pessoal obtida no painel Ollama (`https://ollama.com/settings/keys`).
  - `ollama_modelo_nuvem`: Nome do modelo na nuvem (ex: `gemma2:latest` ou modelo homologado).

#### Como Configurar:
1. Crie uma conta em [ollama.com](https://ollama.com) e gere sua chave de acesso em **Settings › Keys**.
2. No sistema, acesse `Configurações › Inteligência Artificial`.
3. Selecione a opção **"Na nuvem (Ollama Cloud)"**.
4. Cole sua **Chave de API** e confirme o modelo desejado.
5. Clique em **Testar e Salvar**.

### 2.3. Resiliência e Retentativas da IA
Se a IA estiver temporariamente indisponível (ex: máquina reiniciando ou sobrecarga):
- O sistema registra o status `FALHA` com o motivo no histórico do edital.
- Uma rotina automática reexecuta o processamento a cada 15 minutos (até 3 tentativas).
- Após 3 falhas consecutivas, o edital é encaminhado para `EM_REVISAO` com alerta visível para a equipe, garantindo que o fluxo operacional nunca fique travado.

---

## 3. Integração 2: Banco de Dados

O sistema possui uma camada agnóstica de banco de dados (`src/server/db`), permitindo alternar dinamicamente entre base local em arquivo e base colaborativa em nuvem sem reiniciar o servidor.

### 3.1. Modo Local: SQLite Embutido (`node:sqlite`)
- **Arquivo de dados:** `data/editais.db` (armazenado localmente).
- **Driver:** Módulo nativo `node:sqlite` do Node.js v24+, sem dependência de binários compilados em C++.
- **Esquema:** Declarado em `db/schema.sql` (tabelas: `usuarios`, `editais`, `fontes`, `alertas`, `destinatarios`, `perfil`, `criterios`, `config`).
- **Segurança de Dados:**
  - Backups automáticos gerados a cada importação em `data/backups/`.
  - Comando de exportação para compartilhamento:
    ```bash
    npm run db:exportar
    ```
    Gera um snapshot compactado em `exportacoes/editais-AAAA-MM-DD_HHMM.db`.
  - Comando de importação:
    ```bash
    npm run db:importar -- caminho/base.db
    ```

### 3.2. Modo Nuvem: Turso (LibSQL Distribuído)
Permite que múltiplos computadores da I9+ compartilhem a mesma base ao vivo, com replicação e latência de milissegundos.

- **Tecnologia:** Protocolo LibSQL sobre WebSocket/HTTPS (`@libsql/client`).
- **Configuração:** Armazenada em `data/base-conexao.json` (mantida fora do controle de versão Git).
- **Passo a Passo de Integração:**
  1. Crie uma base de dados gratuita ou corporativa em [turso.tech](https://turso.tech).
  2. Obtenha a **Database URL** (`libsql://nome-da-sua-base.turso.io`) e crie um **Auth Token** com permissões de leitura/escrita.
  3. No sistema, acesse `Configurações › Base de dados`.
  4. Selecione **"Na nuvem (Turso)"**, preencha a URL e o Token.
  5. Clique em **Testar conexão**.
  6. Caso a base esteja vazia, você pode optar por enviar os dados locais atuais para a nuvem.
  7. Clique em **Usar a base na nuvem**. A partir deste instante, todos os usuários conectados a essa URL compartilham os mesmos dados em tempo real.

#### Fallback Automático:
Se o servidor for iniciado sem conexão com a internet ou se o token do Turso for revogado, o sistema inicia em modo de contingência na base local e exibe um aviso no cabeçalho com o botão **Reconectar**.

---

## 4. Integração 3: Notificações por E-mail (SMTP)

O envio de alertas automáticos (como prazos próximos e editais de alto fit) utiliza o protocolo **SMTP** padrão da internet através da biblioteca `nodemailer`.

### 4.1. Provedores Suportados e Recomendações

1. **Google Workspace / Gmail:**
   - **Servidor:** `smtp.gmail.com`
   - **Porta:** `465` (com SSL ativo) ou `587` (com TLS/STARTTLS)
   - **Autenticação:** O Google exige **Verificação em 2 etapas** ativada e a criação de uma **Senha de Aplicativo** (*App Password*) em `myaccount.google.com/apppasswords`. **Nunca utilize sua senha pessoal do e-mail**.
2. **Microsoft 365 / Outlook:**
   - **Servidor:** `smtp.office365.com`
   - **Porta:** `587` (TLS ativo)
   - **Usuário:** e-mail institucional completo da I9+.
3. **Servidor SMTP Corporativo Interno (Postfix / Sendmail / Exchange):**
   - **Servidor:** IP interno ou hostname (ex: `192.168.1.25` ou `smtp.i9mais.local`)
   - **Porta:** `25` ou `587` (com ou sem autenticação conforme política interna de relay).

### 4.2. Modo Sandbox (Terminal)
Quando os campos de SMTP não estão configurados, o sistema **não trava nem lança exceções**: ele ativa automaticamente o adaptador `ConsoleAdaptador`, imprimindo o conteúdo completo do e-mail no terminal do servidor com cabeçalhos, destinatários e corpo HTML/texto. Isso é ideal para desenvolvimento e homologação.

### 4.3. Teste Rápido de Envio
Para validar a integração diretamente via linha de comando:
```bash
npm run email:teste -- seu-email@i9mais.com.br
```

---

## 5. Integração 4: Portais de Editais e Fontes de Coleta

O motor de coleta periódica (`ColetaServico`) suporta diferentes naturezas de integração:

### 5.1. Integração via API REST (FINEP)
- **Fonte Padrão Integrada:** Financiadora de Estudos e Projetos (FINEP).
- **Mecanismo:** Chamadas diretas para a API pública de editais abertos da FINEP (`http://api.finep.gov.br` ou endpoints oficiais de chamadas públicas).
- **Vantagens:** Alta velocidade, zero risco de quebra por alteração visual de layout e leitura de metadados ricos (valores globais, datas de submissão, anexos).

### 5.2. Integração por Páginas Web Estáticas (HTML)
- **Tecnologia:** Requisições HTTP com parsing de DOM via `cheerio`.
- **Funcionamento:** O robô acessa a URL configurada, extrai listas de links ancorados em seletores CSS ou padrões de texto e identifica links de novos editais e retificações.

### 5.3. Integração por Páginas Web Dinâmicas (JavaScript / SPAs)
- **Tecnologia:** Motor **Playwright Chromium** headless (ou Microsoft Edge nativo quando em modo executável `.exe`).
- **Funcionamento:** Portais desenvolvidos em React, Angular ou portais de compras públicas que montam a lista de editais dinamicamente via AJAX/JavaScript são abertos em um navegador invisível, aguardando a hidratação completa da tabela antes de extrair os links.
- **Instalação dos binários:**
  ```bash
  npx playwright install chromium
  ```

### 5.4. Deduplicação e Detecção de Retificações
- O sistema gera um hash unívoco para cada edital a partir do título normalizado e link original.
- Se um edital já existente sofrer alteração de texto ou nova publicação de errata na mesma URL, o sistema identifica a mudança e dispara o alerta **E05 (Edital Retificado)** para os gestores.
