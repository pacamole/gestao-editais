# Manual Prático de Configurações do Sistema — Gestor de Editais I9+

> **Para quem é este manual:** Para qualquer pessoa da equipe da I9+ que precise cadastrar ou ajustar as regras do sistema. Você não precisa saber nada de programação! Este guia foi feito como se um colega estivesse sentado ao seu lado, mostrando em quais botões clicar e explicando o porquê de cada campo.

---

## 1. O Nosso Caso Real de Exemplo (Para entender na prática)

Para ficar muito fácil de acompanhar, vamos seguir um **caso real da I9+** do começo ao fim:

* **Nossa Empresa:** `I9+ Tecnologia e Inovação Ltda`
* **Local:** Sede em `Curitiba / PR`.
* **Porte da Empresa:** `EPP (Empresa de Pequeno Porte)` / `Média`.
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
No menu lateral esquerdo, clique em **Configurações** e depois na opção **Perfil da empresa** (`/configuracoes/perfil`).

### O que fazer na tela (passo a passo dos campos):

1. **Razão social:** Digite `I9+ Tecnologia e Inovação Ltda`.
2. **Nome fantasia:** Digite `I9+`.
3. **CNPJ:** Digite o CNPJ da empresa (ex: `12.345.678/0001-90`).
   > ⚠️ **Atenção:** Nunca deixe o CNPJ em branco nem zerado! Se deixar vazio, o sistema bloqueia a análise dos editais novos por segurança, porque quase todo edital exige CNPJ válido.
4. **CNAE principal e secundários:**
   * No *CNAE principal*, coloque o código da atividade principal (ex: `6201-5/01` - Desenvolvimento de programas de computador sob encomenda).
   * Nos *CNAEs secundários*, coloque os outros códigos separados por vírgula (ex: `6202-3/00, 6209-1/00`).
   * *Para que serve isso?* A IA confere se o edital exige que a empresa tenha autorização formal para atuar naquela área.
5. **Porte da empresa (Caixa de seleção):**
   * Clique na caixinha e selecione **`EPP`** (ou `Média`, conforme o enquadramento atual da I9+).
   * *Por que isso é fundamental?* Muitos editais da FINEP e FAPESP são exclusivos para micro e pequenas empresas. Se você selecionar o porte correto, o sistema já elimina automaticamente editais que não aceitam o tamanho da I9+, poupando seu tempo!
6. **Estado (UF) e Município:**
   * No campo *Estado*, digite `PR` e em *Município* digite `Curitiba`.
   * *Para que serve?* Editais estaduais (como da Fundação Araucária do Paraná ou FAPESP de São Paulo) exigem sede no estado. O sistema usa isso para saber se a I9+ pode participar.
7. **Link da página da empresa (Novo campo com leitura automática de até 500 páginas):**
   * Informe o endereço público do site da I9+, começando obrigatoriamente com `https://` ou `http://` (ex: `https://i9mais.com.br`).
   * *Como a IA usa o site:* Na etapa de **Triagem de Elegibilidade**, o sistema valida a página inicial e tenta ler as páginas públicas do mesmo domínio através de links internos e sitemaps (rastreando até **500 páginas**). Em seguida, prioriza o conteúdo mais relevante (lendo até 10 páginas / 30.000 caracteres) para comparar a empresa com as exigências do edital!
   * *Importante:* A URL é validada ao clicar em salvar, e o site é lido automaticamente sempre que uma triagem é executada.
8. **Áreas de atuação e Palavras-chave:**
   * Em *Áreas de atuação*, digite: `software, inteligencia artificial, transformacao digital, automacao`.
   * Em *Palavras-chave*, digite termos que você quer encontrar: `ia, deep learning, fomento a inovacao, subvencao economica`.
9. **Capacidade de contrapartida (%):**
   * Digite `20`.
   * *Para que serve?* Se um edital exigir que a empresa pague 40% do projeto do próprio bolso, o sistema saberá que está acima da nossa capacidade habitual.
10. **Valor mínimo de interesse:**
    * Digite `300000` (R$ 300.000,00). Editais com verbas muito pequenas não serão destacados.
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
No menu lateral esquerdo, em **Configurações**, clique em **Critérios e pesos** (`/configuracoes/criterios`).

---

### Exemplo Prático A: Criando uma Regra Eliminatória (Porte da Empresa)
*Objetivo:* Se o edital não aceitar o nosso porte de empresa, ele deve ser reprovado na hora (ficando com etiqueta vermelha **Não elegível**).

1. No topo da página, clique no botão azul **"+ Novo critério"**.
2. Uma janelinha vai se abrir:
   * **Tipo do critério:** Selecione **"Eliminatório"** (isso significa: se reprovar aqui, está fora!).
   * **Nome do critério:** Digite `Porte aceito pelo edital`.
   * **Campo do edital:** Selecione na lista `Porte aceito`.
   * **Como comparar:** Escolha `Lista contém`.
   * **Comparar com:** Escolha a opção **"Campo do perfil da empresa"** e na caixinha selecione `Porte`.
   * **Mensagem de reprovação:** Digite `O edital exige um porte empresarial diferente do cadastrado pela I9+`.
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
Clique em **Configurações › Fontes monitoradas** (`/configuracoes/fontes`).

### Como cadastrar a FINEP como exemplo prático:
1. Clique no botão **"+ Adicionar fonte"**.
2. Na janela:
   * **Nome:** Digite `FINEP - Chamadas Públicas Abertas`.
   * **Endereço do site (URL):** Cole `http://www.finep.gov.br/chamadas-publicas`.
   * **Horário:** Escolha `06:00` (o robô fará a varredura logo cedo).
3. Clique no botão **"Verificar endereço"** para o sistema conferir se a página abre normalmente.
4. Se der tudo certo, clique em **"Salvar fonte"**.
5. **Para testar na hora:** Vá na tabela de fontes, clique no botão de três pontinhos `...` ao lado da FINEP e escolha **"Buscar agora"**. O sistema vai rodar a busca naquele mesmo segundo!

---

## 5. Passo 4: Cadastrando a Equipe e Configurando os Alertas

Agora vamos cadastrar a **Ana**, o **Carlos** e o **Lucas** para que cada um receba os avisos certos no seu e-mail.

### A) Cadastrando os Destinatários:
1. No menu de configurações, clique em **Destinatários** (`/configuracoes/destinatarios`).
2. Clique em **"+ Novo destinatário"**:
   * Digite o nome: `Ana - Captação`.
   * Digite o e-mail: `ana.comercial@i9mais.com.br`.
   * Nos botõezinhos de alertas abaixo, marque:
     * `E01 - Novo edital de alto fit` (para ela correr e preparar a proposta comercial!).
     * `E04 - Resumo semanal` (para ver o balanço da semana na segunda de manhã).
   * Clique em **"Salvar"**.
3. Repita para o **Carlos**:
   * Nome: `Carlos - Gerente de Projetos`.
   * E-mail: `carlos.projetos@i9mais.com.br`.
   * Marque: `E02 - Prazo de submissão próximo` (para não deixar vencer o prazo) e `E05 - Edital retificado` (se houver prorrogação ou errata).
   * Clique em **"Salvar"**.
4. Repita para o **Lucas (TI)**:
   * Nome: `Lucas - TI`.
   * E-mail: `lucas.suporte@i9mais.com.br`.
   * Marque apenas: `E06 - Falha na coleta` (ele só é incomodado se algum site de editais cair ou quebrar).

---

### B) Configurando o Envio do E-mail (SMTP):
1. Clique na aba **E-mail (SMTP)** (`/configuracoes/email`).
2. Em **Provedor**, selecione `Gmail` (ou `Outlook`).
3. Em **E-mail de envio**, digite o e-mail da I9+ (ex: `notificacoes@i9mais.com.br`).
4. Em **Senha de aplicativo**, cole a senha de 16 letras gerada no painel de segurança do Google/Microsoft.
5. Em **Nome do remetente**, coloque `Editais I9+`.
6. Clique em **"Salvar configuração de e-mail"**.
7. No bloco abaixo de teste, digite o seu e-mail pessoal e clique no botão **"Enviar e-mail de teste"**. Assim que chegar na sua caixa de entrada, está 100% pronto!

---

## 6. Passo 5: Configurações de Inteligência Artificial e Compartilhamento

Para fechar com chave de ouro:

1. **Inteligência Artificial (`Configurações › Inteligência artificial`):**
   * Se você usa o modelo instalado no seu computador, deixe marcado **"Neste computador (Ollama)"**.
   * Se for usar pela nuvem, marque **"Ollama Cloud"** e cole a chave fornecida pela equipe.
   * Em **Limite diário de perguntas no chat**, deixe o padrão de `20` perguntas por usuário por dia (isso serve para ninguém sobrecarregar o processador do servidor à toa).
2. **Base de Dados (`Configurações › Base de dados`):**
   * Se você trabalha sozinho na máquina, pode deixar em **"Neste computador"**.
   * Se a equipe inteira da I9+ vai acessar o sistema ao mesmo tempo, marque **"Na nuvem (Turso)"**, cole o link e o token de acesso e clique em **"Usar a base na nuvem"**.
   * **Quer fazer uma cópia de segurança?** Basta clicar no botão **"Baixar base"** a qualquer momento e você terá um arquivo salvo com todos os dados da I9+ em segurança.
