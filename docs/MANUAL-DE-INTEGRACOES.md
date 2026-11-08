# Manual de Integrações do Sistema — Gestor de Editais I9+

> **Para quem é este manual:** Para qualquer membro da equipe da I9+, gestores de inovação e administradores que precisam entender como o sistema conversa com outros serviços, como ligar novas fontes de editais e quais cuidados tomar no dia a dia.  
> **Linguagem:** Clara, prática e sem termos técnicos desnecessários.

---

## 1. O que são as "Integrações" do Sistema?

Pense no **Gestor de Editais** como uma central de trabalho inteligente na I9+. Sozinho, ele já consegue guardar informações. Mas para não dar trabalho para ninguém ficar caçando editais na internet o dia todo ou lendo documentos de 80 páginas linha por linha, o sistema constrói **"pontes" automáticas** com outros serviços.

Essas pontes são as **integrações**. Hoje, o sistema possui 4 grandes integrações:

```
                  ┌────────────────────────────────────────┐
                  │       GESTOR DE EDITAIS (I9+)          │
                  └──────────────────┬─────────────────────┘
                                     │
       ┌──────────────┬──────────────┴──────────────┬──────────────┐
       ▼              ▼                             ▼              ▼
 🤖 Inteligência   🗄️ Base de                    📧 E-mail      🌐 Fontes de
    Artificial       Dados (Nuvem)                 (SMTP)          Editais
  Lê os editais   Compartilha os dados           Avisa quando    Visita portais
   e tira dúvidas  ao vivo com a equipe          há novidades    e traz editais
```

1. **Inteligência Artificial (IA):** É o nosso leitor assistente. Ela lê os PDFs dos editais, extrai valores, prazos e regras de elegibilidade, e responde suas perguntas no chat de cada edital.
2. **Base de Dados (Nuvem):** É onde tudo fica guardado. Pode funcionar só no seu computador ou ligada na nuvem (Turso) para que toda a equipe da I9+ veja as mesmas informações ao mesmo tempo.
3. **Serviço de E-mail:** É o mensageiro. Quando sai um edital muito bom ou o prazo de inscrição está acabando, ele manda um e-mail avisando as pessoas certas.
4. **Fontes de Editais:** São os robôs que visitam os sites de fomento (como FINEP e portais estaduais) todos os dias para conferir se tem edital novo.

---

## 2. Como os Usuários Podem Adicionar Mais Integrações?

Você não precisa mexer em linhas de código para adicionar ou configurar essas integrações. Tudo é feito por telas simples no menu **Configurações**.

---

### A) Adicionando uma Nova Fonte de Coleta de Editais

Quer que o sistema comece a vigiar um novo portal de editais da internet (por exemplo, um portal estadual de inovação ou ministério)?

1. No menu lateral esquerdo, clique em **Configurações › Fontes monitoradas**.
2. No topo da tela, clique no botão azul **"+ Adicionar fonte"**.
3. Na janela que se abrir, preencha:
   - **Nome da fonte:** Um nome fácil de reconhecer (ex: `FAPESP - Chamadas Vigentes` ou `EMBRAPII Editais`).
   - **Endereço do site (URL):** Cole o link da página onde fica a lista de editais abertos (ex: `https://fapesp.br/chamadas`).
   - **Horário da visita:** Escolha a hora em que o robô deve passar lá todo dia (ex: `06:30` da manhã).
4. Clique no botão **"Verificar endereço"**:
   - O sistema vai dar uma espiada no site na hora para confirmar se consegue ler a página e se achou editais lá dentro.
5. Se der tudo certo, clique em **"Salvar fonte"**.
6. **Quer testar na mesma hora?** Na tabela de fontes, vá na linha da fonte que você acabou de criar, clique no menu de três pontinhos `...` e escolha **"Buscar agora"**. O sistema fará a varredura naquele instante!

---

### B) Conectando o E-mail da I9+ para Envio de Alertas

Para o sistema conseguir enviar e-mails de aviso para a equipe:

1. Acesse **Configurações › E-mail (SMTP)**.
2. No campo **Provedor**, escolha o que a sua empresa usa: `Gmail`, `Outlook` ou `Outro`.
3. Digite o e-mail remetente (ex: `projetos@i9mais.com.br`).
4. **Senha de aplicativo:** Se for Gmail ou Outlook com autenticação de duas etapas, você deve gerar uma "Senha de aplicativo" na sua conta de e-mail e colar aqui (nunca use a sua senha pessoal do dia a dia!).
5. Em **Nome do remetente**, escreva como o e-mail deve chegar na caixa das pessoas (ex: `Editais I9+`).
6. Clique em **"Salvar configuração de e-mail"**.
7. Logo abaixo, no bloco de teste, digite o seu próprio e-mail e clique em **"Enviar e-mail de teste"**. Se a mensagem apitar na sua caixa de entrada, a integração está perfeita!

---

### C) Conectando a Base de Dados na Nuvem (Turso)

Se você quer que tudo o que você cadastre apareça automaticamente no computador dos seus colegas de equipe:

1. Acesse **Configurações › Base de dados**.
2. Em **Onde ficam os dados**, marque **"Na nuvem (Turso)"**.
3. Cole o **Endereço do banco** (que começa com `libsql://...`) e a **Chave de acesso (Token)** fornecidos pelo administrador.
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

1. Vá no menu principal e clique em **"Nova entrada"** (`/editais/novo`).
2. Você tem duas opções super fáceis:
   - **Por Link (URL):** Basta colar o link direto da página daquele edital específico e clicar em "Adicionar edital".
   - **Por Envio de PDF:** Baixe o arquivo PDF do edital no seu computador, arraste para dentro da tela e clique em "Enviar edital".
3. A Inteligência Artificial vai ler o documento com a mesma qualidade e você não corre nenhum risco de o robô da internet falhar!
