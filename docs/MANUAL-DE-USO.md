# Manual de uso do Gestor de Editais I9+

[Manuais](MANUAIS.md)

O sistema centraliza a coleta, o cadastro, a avaliação e o acompanhamento de editais de fomento. A elegibilidade indica se a empresa atende às condições de participação. A nota de fit, de 0 a 100, indica a aderência aos critérios pontuáveis da empresa para editais elegíveis. O status registra a etapa operacional do edital.

## Roteiro do primeiro acesso

1. Abra o endereço da instalação. Clique em **Criar conta**, informe seu nome, um e-mail válido e uma senha de 8 a 128 caracteres. Repita a senha e clique em **Criar minha conta**.
2. Acesse **Configurações › Perfil da empresa** e cadastre os dados reais. Enquanto o perfil estiver ausente ou provisório, os editais aguardam na fila. O aviso **Cadastrar perfil** leva diretamente à tela.
3. Em **Inteligência artificial**, configure o serviço local ou em nuvem e confirme que o modelo está disponível. Depois, revise **Critérios e pesos** para que as comparações reflitam as condições da empresa.
4. Cadastre um edital em **Nova entrada** ou execute **Buscar agora** em uma fonte monitorada. Abra o registro e acompanhe o **Veredito**.
5. Se a equipe usar alertas, configure o SMTP, verifique os destinatários e escolha quais eventos serão enviados. Os avisos **Configurar e-mail** e **Adicionar destinatário** abrem as seções correspondentes.

O cadastro acrescenta o e-mail da conta à lista de destinatários. A sessão dura oito horas. Se expirar, faça login novamente. Se o e-mail já estiver cadastrado, use a conta existente. Se as credenciais forem recusadas, confira o e-mail e a senha.

## Acesso e navegação

| Controle | Efeito |
| --- | --- |
| **Entrar na plataforma** | Autentica com o e-mail e a senha cadastrados e abre a área de trabalho. |
| **Criar conta** | Abre o formulário de cadastro. No formulário, informe nome, e-mail, senha e confirmação e clique em **Criar minha conta** para cadastrar a conta. |
| **Mostrar senha / Ocultar senha** | Alterna a exibição da senha digitada. |
| **Voltar para login** | Retorna ao formulário de acesso. |
| **Dashboard**, **Editais** e **Nova entrada** | Abrem, respectivamente, o painel de acompanhamento, a lista de editais e o formulário de cadastro. |
| **Configurações** | Abre os parâmetros do sistema. Consulte o [manual de configurações](MANUAL-DE-CONFIGURACOES.md). |
| **Manuais** | Abre a documentação incorporada ao aplicativo. As abas alternam o manual exibido. **Baixar Markdown (.md)** baixa o manual ativo. **Salvar em PDF / Imprimir** abre o diálogo de impressão do navegador para esse manual. |
| **Sair da conta** | Encerra a sessão e retorna à tela de acesso. |

## Dashboard

**+ Nova entrada** abre o cadastro. **Ver todos os editais** abre a lista geral. **Ver urgentes** abre a lista com filtro de urgência. **Ver elegíveis** abre a lista de elegíveis com fit alto. **Gerenciar fontes** abre as configurações da coleta. O link **Editais I9+** no menu e **Voltar ao dashboard** na página de erro retornam ao painel.

Os cartões de novos da semana, aguardando revisão, aprovados sem inscrição e com prazo em até sete dias abrem a lista de editais com o recorte correspondente. **Distribuição por classificação** resume as faixas de classificação. **Top Fit Comercial** apresenta os editais com maior aderência. **Editais urgentes** destaca prazos próximos. Clique no título de um edital para consultar seu registro. **Painel de saúde da coleta** mostra a situação das fontes e o resultado da última busca.

Quando ainda não há editais, **Enviar edital** abre **Nova entrada** e **Monitorar um órgão** abre **Fontes monitoradas**. O painel de coleta permite distinguir uma fonte que ainda não foi consultada de uma execução concluída ou com falha.

## Lista de editais

| Controle | Efeito |
| --- | --- |
| **Busca por texto** | Pesquisa pelo título, pelo órgão financiador ou pelo número do edital. |
| **Status**, **Elegibilidade**, **Faixa de Nota**, **Modalidade** e **Origem** | Restringem os resultados, respectivamente, pela etapa de trabalho, pelo veredito de elegibilidade, pela faixa de fit, pela modalidade de fomento e pela origem do registro. |
| **Prazo de**, **Prazo até** e **Prazo aberto** | Filtram pelo intervalo de datas ou mantêm apenas editais com inscrições ainda no prazo. |
| **Limpar filtros** | Remove os filtros aplicados. |
| **Anterior / Próxima** | Navegam entre as páginas de resultados. |
| **Exportar CSV** | Baixa uma planilha CSV da visão filtrada. |
| **Título do edital** | Abre os detalhes do registro. |
| **Caixas de seleção** | Marcam os registros para ações em lote. |
| **Aprovar selecionados** | Solicita a aprovação dos registros selecionados, conforme as transições permitidas. |
| **Descartar selecionados** | Abre a confirmação de descarte em lote. Informe a justificativa e confirme para aplicar a ação. **Cancelar** fecha a confirmação. |
| **Cancelar seleção** | Limpa os registros marcados. |

A lista padrão omite os editais **Fora do perfil**. Para localizar um deles, selecione **Status › Fora do perfil**, abra o registro e use **Resgatar para análise** se desejar devolvê-lo à fila. A ordenação prioriza a elegibilidade, depois a maior nota e, em seguida, o prazo mais próximo.

A tabela apresenta título e número da chamada, órgão, modalidade, prazo, valor máximo por projeto, elegibilidade, nota e status. Em **Prazo**, a indicação **Hoje** significa que a data de inscrição é o dia atual. **Vencido** sinaliza data passada. Um traço indica que o dado ainda está ausente. A nota tem três faixas: alto fit a partir de 70, médio de 40 até menos de 70 e baixo abaixo de 40.

Para selecionar todos os registros exibidos, marque a caixa no cabeçalho. Ela atua sobre a página atual. Em uma ação em lote, confira o retorno com a quantidade aplicada e os registros ignorados. Um registro pode ser ignorado se o status atual impedir a ação.

## Nova entrada

| Controle | Efeito |
| --- | --- |
| **Upload de PDF** | Permite selecionar ou arrastar um PDF de até 20 MB. O controle de remoção limpa o arquivo selecionado. **Processar edital e avançar** envia o arquivo e abre o registro resultante. |
| **Colar URL** | Recebe o endereço da publicação ou do PDF. **Processar endereço e avançar** solicita a leitura desse endereço e abre o registro resultante. |
| **Cadastro manual** | Permite informar identificação, cronograma, valores, contrapartida, requisitos e resumo. **Cadastrar edital e ver análise** grava o registro e abre seus detalhes. |

No cadastro manual, os dados básicos identificam a chamada, o órgão, a modalidade e a abrangência. As datas registram publicação, encerramento da inscrição e previsão de resultado. Os valores distinguem o orçamento total do limite por projeto. Os requisitos registram o público-alvo, os portes e CNAEs aceitos, os temas, o tempo de fundação, as certidões e as exigências adicionais exibidas no formulário. Esses dados podem alimentar os critérios de avaliação.

### Escolher a forma de cadastro

- **PDF com texto selecionável.** Use o envio de arquivo para trabalhar com um documento em mãos. O sistema extrai o texto antes de criar a entrada. Se o arquivo estiver integralmente digitalizado como imagem, aplique OCR externamente e tente novamente. Se apenas algumas páginas estiverem sem texto, confira o aviso e leia essas páginas no original. O mesmo conteúdo de arquivo pode abrir um registro já existente.
- **Endereço de publicação ou PDF.** Cole um endereço iniciado por `http://` ou `https://`. A tela pode abrir com um título provisório enquanto o servidor busca o conteúdo. Se o endereço já estiver registrado, o sistema abre o edital existente.
- **Cadastro manual.** Use quando tiver os dados da chamada em mãos. Informe o título e preencha os demais campos conhecidos. Separe listas, como CNAEs e certidões, por vírgulas. Marque as caixas de contrapartida, parceria com ICT ou submissão múltipla conforme o documento. O cadastro cria um registro a partir dos campos digitados. A triagem documental e o chat dependem de conteúdo para leitura.

## Detalhes do edital

| Controle ou seção | Efeito |
| --- | --- |
| **← Editais** | Retorna à lista. Os links de origem ou documento abrem o endereço associado ao edital. |
| **Veredito** | Exibe a elegibilidade, a nota quando aplicável e o resultado dos critérios disponíveis. |
| **Analisar elegibilidade** | Executa a triagem inicial. A IA identifica requisitos e compara cada um com o perfil da empresa e, quando disponível, com seu site público. A triagem também é executada em segundo plano para editais novos com texto disponível. |
| **Fazer análise profunda** | Solicita à IA a extração estruturada de dados do edital, como prazos, valores e requisitos, e recalcula a avaliação com os critérios configurados. A ação exige texto disponível ou endereço para leitura. |
| **Editar dados** | Abre os campos extraídos para edição manual. **Salvar alterações** grava os dados editados e atualiza a avaliação. **Cancelar** fecha a edição sem gravar. |
| **Chat sobre o edital** | Responde perguntas com base no documento. Clique em uma pergunta sugerida para enviá-la ou digite uma pergunta e clique em **Enviar**. O chat depende de texto disponível e de IA configurada. |
| **Limpar conversa** | Apaga o histórico do chat associado ao edital para o usuário. |
| **Autorizar e salvar selecionados** | Aplica somente as correções de dados que o usuário marcou entre as sugestões do chat. Confira a evidência de cada sugestão antes de autorizar. |
| **Revisão e histórico** | Exibe as ações permitidas pelo status atual, o campo de comentário e a linha do tempo das decisões. |

| Botão de revisão | Alteração registrada |
| --- | --- |
| **Aprovar** | Marca o edital como aprovado para acompanhamento. |
| **Descartar** | Marca o edital como descartado e exige justificativa. |
| **Marcar como inscrito** | Registra no sistema uma inscrição efetuada pela equipe no canal do edital. |
| **Registrar resultado** | Registra a ação no histórico e encerra o edital inscrito. |
| **Reabrir** | Retorna um edital descartado ou expirado à revisão. |
| **Resgatar para análise** | Retorna um edital classificado como fora do perfil à fila de processamento. |

### Conferir a triagem e as evidências

1. Abra **Triagem de elegibilidade**. Para executar uma nova leitura, clique em **Analisar elegibilidade**. O botão fica indisponível enquanto analisa ou quando o registro não tem texto nem endereço.
2. Leia o resultado geral e cada requisito. **Atende** indica que a comparação encontrou elementos favoráveis. **Não atende** indica uma incompatibilidade. **Não determinado** sinaliza informação insuficiente. Confira o trecho do edital e abra as páginas do site usadas como fonte, quando exibidas.
3. Compare as quantidades de páginas lidas e incluídas no contexto da IA. Se houver aviso de leitura parcial, verifique os requisitos diretamente nos documentos oficiais e complete o perfil quando necessário.
4. Consulte o **Veredito** para identificar reprovações, campos que exigem verificação manual e contribuições de cada critério à nota. Se nenhum critério pontuável pôde ser avaliado, um edital elegível pode aparecer sem nota.
5. Execute **Fazer análise profunda** para preencher campos vazios com evidências verificáveis. Se o texto já estiver salvo, a análise usa esse conteúdo. Caso contrário, tenta ler o endereço do documento ou da publicação. Durante a execução, o botão mostra **Analisando edital...**. Se nenhum campo novo tiver evidência suficiente, a tela informa que os valores existentes foram preservados.

### Consultar e editar os dados extraídos

| Campo ou grupo | O que conferir |
| --- | --- |
| **Título**, **Órgão financiador**, **Número do edital**, **Modalidade** | Identificação da chamada e forma do apoio. A modalidade pode ser subvenção, crédito, prêmio, licitação, chamada pública ou outro. |
| **Data de publicação**, **Prazo de inscrição**, **Resultado previsto** | Publicação, último dia de inscrição e data prevista para divulgação do resultado. |
| **Valor total disponível**, **Valor máximo por projeto** | Orçamento global da chamada e limite de apoio a cada proposta. |
| **Exige contrapartida**, **Percentual de contrapartida** | Indicação da exigência e percentual mínimo de recursos próprios. |
| **Público-alvo**, **CNAEs aceitos**, **Portes aceitos**, **Natureza jurídica aceita** | Tipos de proponente, atividades e formas empresariais admitidas. |
| **Abrangência geográfica**, **Exige ICT parceira**, **Tempo mínimo de fundação (meses)** | Regiões atendidas, necessidade de parceria e idade mínima da empresa. |
| **Faturamento mínimo / máximo**, **Certidões exigidas** | Faixa de faturamento e documentos de regularidade exigidos. |
| **Áreas temáticas**, **Permite submissão múltipla**, **Resumo executivo** | Temas aceitos, possibilidade de enviar mais de uma proposta e síntese do objetivo da chamada. |

A coluna **Evidência** indica se o valor foi **Editado manualmente**, **Informado pela fonte** ou sustentado por um trecho. **Ver trecho** expande a citação e mostra o número da página quando disponível. Para corrigir um valor, use **Editar dados**, altere apenas os campos necessários e clique em **Salvar alterações**. Nas listas, separe os itens por vírgulas. Um valor apagado pode passar a **Não localizado**. Para campos do tipo sim ou não, selecione **Não localizado** se a informação estiver ausente.

### Usar o chat e registrar a decisão

1. Digite uma pergunta específica, por exemplo, «Qual é o percentual mínimo de contrapartida e em que trecho ele aparece?». Clique em **Enviar** ou escolha uma pergunta pronta. Se a cota diária estiver esgotada, a interface bloqueia novos envios.
2. Se o chat sugerir uma correção, compare o valor atual, a proposta e a evidência. As caixas começam desmarcadas. Selecione as correções que conferiu e use **Autorizar e salvar selecionados**. A operação aplica apenas as selecionadas.
3. Para decidir sobre a oportunidade, use **Revisão e histórico**. Digite o comentário antes de executar a ação. O descarte exige justificativa. Para registrar o resultado, use o comentário para descrever o desfecho e clique em **Registrar resultado**.
4. Consulte a **Linha do tempo** para recuperar as ações anteriores. A inscrição é realizada no canal oficial da chamada. Use **Marcar como inscrito** depois para registrar a situação internamente.

### Entender os status

| Status | Significado operacional |
| --- | --- |
| **Coletado** | Registro recebido e aguardando processamento. Pode permanecer na fila enquanto o perfil estiver incompleto. |
| **Em análise** | Processamento inicial em andamento. Os detalhes são atualizados automaticamente durante o processamento. |
| **Analisado** | A avaliação inicial foi registrada. Consulte a elegibilidade e a nota no veredito. |
| **Falha** | Houve erro de leitura ou avaliação. O aviso pode mostrar o motivo e a previsão de nova tentativa. |
| **Em revisão** | O edital requer conferência, por exemplo por resultado indeterminado, ou foi reaberto para revisão. |
| **Aprovado** | A equipe decidiu acompanhar a oportunidade. A inscrição ainda deve ser registrada. |
| **Descartado** | A equipe encerrou a análise com justificativa. Pode voltar à revisão por **Reabrir**. |
| **Inscrito** | A equipe registrou a inscrição. **Registrar resultado** encerra a oportunidade. |
| **Encerrado** | O resultado foi registrado após a inscrição. |
| **Expirado** | O sistema identificou prazo vencido ou inatividade acima do limite em um edital sem prazo. **Reabrir** volta à revisão. |
| **Fora do perfil** | O filtro de relevância classificou a entrada automática fora do perfil. **Resgatar para análise** devolve o edital à fila. |

### Resolver dificuldades de uso

| Sintoma | Como proceder |
| --- | --- |
| **Edital fica como Coletado** | Confira o perfil e os avisos do veredito. Mantenha o servidor em execução para a fila avançar. |
| **Falha temporária na IA** | Verifique o serviço em **Inteligência artificial**. A rotina espera cerca de 15 minutos para repetir falhas elegíveis, até três tentativas. Quando a leitura por IA esgota as tentativas, confira o aviso e complete os dados manualmente. |
| **Campos aparecem como Não localizado** | Abra o documento original, procure a cláusula correspondente e use **Editar dados** para registrar o valor confirmado. |
| **Triagem ou análise profunda indisponível** | Verifique se o edital tem endereço ou texto legível. Um cadastro apenas digitado pode não ter documento para leitura. |
| **Nenhum edital na lista** | Use **Limpar filtros** e confira o Dashboard. Se a base estiver vazia, cadastre um edital ou confira a última coleta da fonte. |
| **Uma ação de revisão não aparece** | Confira o status. **Marcar como inscrito**, por exemplo, aparece em editais aprovados, e **Registrar resultado**, em editais inscritos. |

## Requisitos computacionais

### Execução local do modelo de linguagem

Instale o Ollama na máquina que executará o modelo. A aplicação usa `gemma2:latest` no modo local e solicita uma janela de contexto de 8 mil tokens. O pacote do modelo ocupa cerca de 5,4 GB em disco. Reserve espaço adicional para o runtime e memória para o modelo, o contexto e os processos em execução. O tamanho do download e a memória de execução são medidas distintas. Consulte a [ficha do modelo](https://ollama.com/library/gemma2:latest) e a [documentação de contexto](https://docs.ollama.com/context-length).

A execução pode usar CPU e RAM. Uma GPU compatível pode acelerar a inferência. O projeto não estabelece mínimos homologados de CPU, RAM ou VRAM. Dimensione a máquina com medições de memória e tempo de resposta durante a triagem e a análise profunda de editais representativos. `ollama ps` mostra como o modelo foi carregado.

```bash
ollama pull gemma2:latest
ollama serve
```

Execute `ollama serve` se o serviço ainda estiver parado. Consulte o [manual de integrações](MANUAL-DE-INTEGRACOES.md) para testar a conexão.

Para um teste local do projeto, instale as dependências, prepare a base e execute `npm run dev`. Se a equipe tiver o executável Windows gerado pelo projeto, abra `gestao-editais.exe`. Ele cria a base no primeiro uso e abre o navegador. Fechar a janela do processo encerra o sistema. Os dados dessa modalidade ficam em `%USERPROFILE%\GestaoEditais`. Para páginas que dependem de JavaScript, o executável procura Edge ou Chrome instalados.

### Hospedagem da aplicação em servidor

O projeto documenta Node.js 24 ou superior. O processo Express serve a interface React e a API. A conta do processo precisa de acesso de escrita aos diretórios de dados e de exportações. Para leitura de páginas que dependem de JavaScript, instale o Chromium do Playwright e suas dependências de sistema. A coleta requer acesso às fontes e, conforme as integrações ativadas, o servidor também precisa alcançar o Ollama, o Turso e o SMTP.

Dimensione CPU e memória para o Node, a extração de PDFs e o Chromium durante as coletas. Dimensione disco para o banco local, os PDFs e as exportações. Se o Ollama rodar no mesmo servidor, inclua o consumo do modelo na medição. O repositório não fornece benchmarks de capacidade para esses cenários.

1. A partir da raiz do projeto, execute `npm install` e, para as fontes dinâmicas, `npx playwright install chromium`. Em Linux, instale também as dependências do navegador com `npx playwright install-deps chromium`.
2. Copie `.env.example` para `.env`. Configure `APP_URL` e `DATABASE_PATH` conforme o [manual de configurações](MANUAL-DE-CONFIGURACOES.md).
3. Para uma base nova, execute `npm run db:reset`. Esse comando apaga a base de destino antes de recriá-la. Para partir de uma cópia existente, use `npm run db:importar -- caminho/base.db`.
4. No Windows, execute `npm run build`. Em Linux, execute `npx vite build` e depois `npx tsc -p tsconfig.server.json`. O empacotador chamado por `npm run build` exige Windows.
5. Execute `npm start` na raiz do projeto. Abra a aplicação no navegador, faça o cadastro inicial e confira `/api/health` no endereço configurado. O servidor precisa permanecer em execução para realizar as rotinas agendadas.

Para validar a implantação, abra a página inicial em outro computador autorizado, confira se os links dos e-mails apontam para o endereço acessível e execute uma coleta de teste. Observe o consumo de CPU, memória e disco durante a leitura de um edital longo e, se usar Chromium, durante uma coleta dinâmica. Para comparar dois cenários de hospedagem, repita as mesmas operações com Ollama na mesma máquina e com Ollama separado ou em nuvem. Registre o tempo de triagem e de análise profunda e o pico de memória de cada cenário.

A aplicação abre um servidor HTTP. Em uma implantação com proxy HTTPS, considere que a porta de escuta e os links de alertas são derivados do mesmo `APP_URL`.
