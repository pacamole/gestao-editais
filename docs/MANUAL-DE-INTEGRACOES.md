# Manual de integrações do Gestor de Editais I9+

[Manuais](MANUAIS.md)

## Inteligência artificial

A integração com Ollama atende à triagem de elegibilidade, à extração estruturada, ao chat e a etapas de descoberta e leitura de fontes. A triagem pode consultar o site público da empresa indicado no perfil.

- **Ollama local.** Instale o modelo `gemma2:latest` e inicie o serviço na máquina de inferência. Em **Configurações › Inteligência artificial**, selecione o modo local. O endereço padrão é `http://localhost:11434`, visto a partir do servidor da aplicação. Para um serviço em outra máquina, informe seu endereço HTTP ou HTTPS no campo **Endereço do Ollama**. Clique em **Testar**, salve o endereço e, se estiver trocando de modo, use **Usar este computador**.
- **Ollama Cloud.** Selecione **Ollama Cloud**, informe a chave de API, clique em **Conferir chave** para carregar os modelos disponíveis e escolha o modelo. Use **Salvar e usar o Ollama Cloud** para ativar o modo ou **Salvar** para atualizar a configuração já ativa. Nesse modo, o provedor recebe o contexto das solicitações de IA, que pode conter dados do perfil e trechos do edital.
- **Verificação.** O painel de status informa se o serviço responde e se o modelo está disponível. Em caso de erro, verifique o endereço e o serviço local ou a chave e o modelo em nuvem, conforme a mensagem apresentada.

## Base de dados

- **SQLite local.** O sistema usa o arquivo indicado por `DATABASE_PATH`, cujo padrão é `data/editais.db`. Em uma instalação hospedada, esse arquivo fica no servidor. Use **Configurações › Base de dados** para exportar a base ou importar uma cópia compatível.
- **Turso.** Em **Base de dados › Na nuvem (Turso)**, informe a URL `libsql://` e o token, depois clique em **Testar conexão**. Se a base estiver vazia, escolha entre enviar os dados locais e iniciar com uma base vazia. Se a base já contiver dados, a aplicação passará a usar o conteúdo existente. Confirme com **Usar a base na nuvem**.
- **Armazenamento.** Textos extraídos, análises e demais registros persistidos ficam na base ativa. Os arquivos PDF ficam no armazenamento local da instalação que os coletou. A configuração de conexão Turso fica em `base-conexao.json`, ao lado do banco local.
- **Verificação.** Consulte a indicação **em uso** e o resumo dos dados. Se a conexão falhar, confira o acesso à rede e as credenciais. **Reconectar** tenta restabelecer a conexão configurada. Consulte [Base de dados](BASE-DE-DADOS.md) para os procedimentos de cópia.

## E-mail SMTP

Em **Configurações › E-mail (SMTP)**, selecione um provedor predefinido ou **Outro**. Informe a conta remetente, a credencial aceita pelo provedor e o nome exibido. Para **Outro**, preencha também o servidor e a porta SMTP. Clique em **Salvar**. Em **Testar envio**, informe o endereço de destino e clique em **Enviar e-mail de teste**. Confirme o recebimento na caixa de entrada.

A lista em **Destinatários** fornece os endereços que podem receber notificações. Em **Alertas**, defina os eventos ativos e os destinatários de cada um. Com o SMTP desligado, o adaptador registra os envios no terminal do servidor.

## Fontes monitoradas e leitura de documentos

| Integração | Funcionamento e verificação |
| --- | --- |
| **FINEP** | Fonte integrada com consulta à API pública da FINEP. Confira o resultado por **Buscar agora** e pelo painel de saúde da coleta. [API da FINEP](API-FINEP.md) |
| **EMBRAPII** | Fonte integrada com rotina própria de leitura das chamadas publicadas. Pode ter o horário alterado e ser pausada ou retomada. |
| **Fontes adicionadas** | Cadastre a página de listagem em **Fontes monitoradas › + Adicionar fonte**. Use **Verificar página** para verificar a leitura antes de confirmar o cadastro. O resultado pode oferecer um endereço alternativo ou o cadastro avulso de uma publicação. |
| **Leitura de páginas e PDFs** | A aplicação lê o HTML das páginas, pode abrir páginas dependentes de JavaScript com Playwright e extrai texto de PDFs com PDF.js. A leitura de um PDF digitalizado depende de uma camada de texto disponível no arquivo. |
| **Site da empresa** | A triagem parte do endereço público cadastrado no perfil e procura páginas por links internos e sitemaps. A descoberta é limitada a 500 páginas e 10 milhões de caracteres. O texto enviado ao modelo respeita o limite de contexto, com prioridade para trechos relevantes. A triagem mostra as páginas usadas como evidência, quando disponíveis. |

Use **Buscar agora** para executar uma coleta imediata. Compare a última execução, a quantidade de novos registros e a situação da fonte. Se uma fonte falhar, confira o endereço, o acesso a partir do servidor e a disponibilidade do Chromium quando a página depender de JavaScript.
