# Manual de integrações do Gestor de Editais I9+

[Manuais](MANUAIS.md)

## Inteligência artificial

A integração com Ollama atende à triagem de elegibilidade, à extração estruturada, ao chat e a etapas de descoberta e leitura de fontes. A triagem pode consultar o site público da empresa indicado no perfil.

- **Ollama local.** Instale o modelo `gemma2:latest` e inicie o serviço na máquina de inferência. Em **Configurações › Inteligência artificial**, selecione o modo local. O endereço padrão é `http://localhost:11434`, visto a partir do servidor da aplicação. Para um serviço em outra máquina, informe seu endereço HTTP ou HTTPS no campo **Endereço do Ollama**. Clique em **Testar**, salve o endereço e, se estiver trocando de modo, use **Usar este computador**.
- **Ollama Cloud.** Selecione **Ollama Cloud**, informe a chave de API, clique em **Conferir chave** para carregar os modelos disponíveis e escolha o modelo. Use **Salvar e usar o Ollama Cloud** para ativar o modo ou **Salvar** para atualizar a configuração já ativa. Nesse modo, o provedor recebe o contexto das solicitações de IA, que pode conter dados do perfil e trechos do edital.
- **Verificação.** O painel de status informa se o serviço responde e se o modelo está disponível. Em caso de erro, verifique o endereço e o serviço local ou a chave e o modelo em nuvem, conforme a mensagem apresentada.

### Conferir a configuração de IA

| Indicação | Verificação |
| --- | --- |
| **Conexão disponível e modelo encontrado** | Abra um edital com texto e teste uma pergunta no chat ou execute a triagem. O teste de conexão verifica o serviço e a disponibilidade do modelo. |
| **Serviço local indisponível** | Confira se o Ollama está em execução e se o endereço responde a partir da máquina do servidor. |
| **Modelo local ausente** | Execute `ollama pull gemma2:latest` na máquina que hospeda o Ollama e repita **Testar**. |
| **Chave em falta ou recusada** | Informe a chave do Ollama Cloud, clique em **Conferir chave** e confirme que a lista de modelos foi carregada. |
| **Conexão funciona, mas a leitura falha** | Confira se o documento contém texto, se a URL abre a publicação e se o veredito mostra falha transitória. Uma configuração válida pode coexistir com problemas em um documento específico. |

## Base de dados

- **SQLite local.** O sistema usa o arquivo indicado por `DATABASE_PATH`, cujo padrão é `data/editais.db`. Em uma instalação hospedada, esse arquivo fica no servidor. Use **Configurações › Base de dados** para exportar a base ou importar uma cópia compatível.
- **Turso.** Em **Base de dados › Na nuvem (Turso)**, informe a URL `libsql://` e o token, depois clique em **Testar conexão**. Se a base estiver vazia, escolha entre enviar os dados locais e iniciar com uma base vazia. Se a base já contiver dados, a aplicação passará a usar o conteúdo existente. Confirme com **Usar a base na nuvem**.
- **Armazenamento.** Textos extraídos, análises e demais registros persistidos ficam na base ativa. Os arquivos PDF ficam no armazenamento local da instalação que os coletou. A configuração de conexão Turso fica em `base-conexao.json`, ao lado do banco local.
- **Verificação.** Consulte a indicação **em uso** e o resumo dos dados. Se a conexão falhar, confira o acesso à rede e as credenciais. **Reconectar** tenta restabelecer a conexão configurada. Consulte [Base de dados](BASE-DE-DADOS.md) para os procedimentos de cópia.

### Interpretar o teste do Turso

| Resultado do teste | Procedimento |
| --- | --- |
| **Sem conexão** | Confira a URL e a conectividade entre o servidor e o Turso. |
| **Token recusado** | Confira se o token corresponde à base informada. |
| **Esquema diferente** | Confira se a URL aponta para a base do Gestor de Editais e se ela é compatível com a versão em execução. |
| **Base vazia** | Escolha se deseja enviar os dados locais ou começar com a base vazia. Ao começar vazia, crie uma conta para entrar na nova base. |
| **Base com dados** | Confira o resumo dos registros antes de ativar a conexão. A aplicação passa a usar as contas, os editais e as configurações do destino. |

Ao voltar para a base local, a aplicação retoma a cópia que estava guardada. Ao operar em nuvem, as alterações na base ativa ficam disponíveis para as demais instalações conectadas ao mesmo destino. A exportação em SQLite contém os registros da base. Os arquivos PDF e o arquivo de conexão são armazenados separadamente.

## E-mail SMTP

Em **Configurações › E-mail (SMTP)**, selecione um provedor predefinido ou **Outro**. Informe a conta remetente, a credencial aceita pelo provedor e o nome exibido. Para **Outro**, preencha também o servidor e a porta SMTP. Clique em **Salvar**. Em **Testar envio**, informe o endereço de destino e clique em **Enviar e-mail de teste**. Confirme o recebimento na caixa de entrada.

A lista em **Destinatários** fornece os endereços que podem receber notificações. Em **Alertas**, defina os eventos ativos e os destinatários de cada um. Com o SMTP desligado, o adaptador registra os envios no terminal do servidor.

### Conferir o envio

Os perfis predefinidos da aplicação usam `smtp.gmail.com:465` e `smtp-mail.outlook.com:587`. O adaptador abre TLS implícito na porta 465 e usa a autenticação por usuário e credencial. Para um servidor manual, confirme com o administrador do provedor a combinação aceita de endereço, porta e credencial.

Se o teste de envio falhar, confira o acesso do servidor ao SMTP e a autenticação. Se o teste passar e um alerta automático não chegar, verifique se o alerta está ativo, se o endereço pertence à lista selecionada e se o evento atende ao parâmetro configurado. Abra **Histórico de envios** para conferir o tipo, destinatários e situação da tentativa.

## Fontes monitoradas e leitura de documentos

| Integração | Funcionamento e verificação |
| --- | --- |
| **FINEP** | Fonte integrada com consulta à API pública da FINEP. Confira o resultado por **Buscar agora** e pelo painel de saúde da coleta. [API da FINEP](API-FINEP.md) |
| **EMBRAPII** | Fonte integrada que consulta o RSS de chamadas públicas. A IA seleciona os itens considerados abertos e o sistema consulta a página de cada chamada. Pode ter o horário alterado e ser pausada ou retomada. |
| **Fontes adicionadas** | Cadastre a página de listagem em **Fontes monitoradas › + Adicionar fonte**. Use **Verificar página** para verificar a leitura antes de confirmar o cadastro. O resultado pode oferecer um endereço alternativo ou o cadastro avulso de uma publicação. |
| **Leitura de páginas e PDFs** | A aplicação lê o HTML das páginas, pode abrir páginas dependentes de JavaScript com Playwright e extrai texto de PDFs com PDF.js. A leitura de um PDF digitalizado depende de uma camada de texto disponível no arquivo. |
| **Site da empresa** | A triagem parte do endereço público cadastrado no perfil e procura páginas por links internos e sitemaps. A descoberta é limitada a 500 páginas e 10 milhões de caracteres. O texto enviado ao modelo respeita o limite de contexto, com prioridade para trechos relevantes. A triagem mostra as páginas usadas como evidência, quando disponíveis. |

### Verificar uma fonte adicionada pela equipe

1. Em **Fontes monitoradas**, clique em **+ Adicionar fonte**. Digite um nome, cole a página pública que lista as chamadas e escolha o horário.
2. Clique em **Verificar página**. Se a página for identificada como uma publicação individual, **Adicionar de forma avulsa** cria a entrada correspondente. Se precisar localizar uma listagem, clique em **Tentar achar a fonte dos editais neste link** e confira a sugestão antes de usar **Usar este endereço**.
3. Marque **Buscar editais nesta fonte** e clique em **Adicionar fonte** para concluir o cadastro. Na lista, abra **⋯ › Buscar agora** para testar sem aguardar o horário diário.
4. Confira **Última busca**, **Novos** e **Situação**. Uma execução com zero novos pode indicar que os itens encontrados já existem. Se a execução falhar, consulte a mensagem e confira se o portal exige acesso, devolve conteúdo vazio ou depende de JavaScript.

Use **Buscar agora** para executar uma coleta imediata. Compare a última execução, a quantidade de novos registros e a situação da fonte. Se uma fonte falhar, confira o endereço, o acesso a partir do servidor e a disponibilidade do Chromium quando a página depender de JavaScript.
