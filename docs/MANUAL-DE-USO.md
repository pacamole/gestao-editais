# Manual de uso do Gestor de Editais I9+

[Manuais](MANUAIS.md)

O sistema centraliza a coleta, o cadastro, a avaliação e o acompanhamento de editais de fomento. A elegibilidade indica se a empresa atende às condições de participação. A nota de fit, de 0 a 100, indica a aderência aos critérios pontuáveis da empresa para editais elegíveis. O status registra a etapa operacional do edital.

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

## Lista de editais

| Controle | Efeito |
| --- | --- |
| **Busca por texto** | Restringe a lista pela pesquisa informada. |
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

## Nova entrada

| Controle | Efeito |
| --- | --- |
| **Upload de PDF** | Permite selecionar ou arrastar um PDF de até 20 MB. O controle de remoção limpa o arquivo selecionado. **Processar edital e avançar** envia o arquivo e abre o registro resultante. |
| **Colar URL** | Recebe o endereço da publicação ou do PDF. **Processar endereço e avançar** solicita a leitura desse endereço e abre o registro resultante. |
| **Cadastro manual** | Permite informar identificação, cronograma, valores, contrapartida, requisitos e resumo. **Cadastrar edital e ver análise** grava o registro e abre seus detalhes. |

No cadastro manual, os dados básicos identificam a chamada, o órgão, a modalidade e a abrangência. As datas registram publicação, encerramento da inscrição e previsão de resultado. Os valores distinguem o orçamento total do limite por projeto. Os requisitos registram o público-alvo, os portes e CNAEs aceitos, os temas, o tempo de fundação, as certidões e as exigências adicionais exibidas no formulário. Esses dados podem alimentar os critérios de avaliação.

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

## Requisitos computacionais

### Execução local do modelo de linguagem

Instale o Ollama na máquina que executará o modelo. A aplicação usa `gemma2:latest` no modo local e solicita uma janela de contexto de 8 mil tokens. O pacote do modelo ocupa cerca de 5,4 GB em disco. Reserve espaço adicional para o runtime e memória para o modelo, o contexto e os processos em execução. O tamanho do download e a memória de execução são medidas distintas. Consulte a [ficha do modelo](https://ollama.com/library/gemma2:latest) e a [documentação de contexto](https://docs.ollama.com/context-length).

A execução pode usar CPU e RAM. Uma GPU compatível pode acelerar a inferência. O projeto não estabelece mínimos homologados de CPU, RAM ou VRAM. Dimensione a máquina com medições de memória e tempo de resposta durante a triagem e a análise profunda de editais representativos. `ollama ps` mostra como o modelo foi carregado.

```bash
ollama pull gemma2:latest
ollama serve
```

Execute `ollama serve` se o serviço ainda estiver parado. Consulte o [manual de integrações](MANUAL-DE-INTEGRACOES.md) para testar a conexão.

### Hospedagem da aplicação em servidor

O projeto documenta Node.js 24 ou superior. O processo Express serve a interface React e a API. A conta do processo precisa de acesso de escrita aos diretórios de dados e de exportações. Para leitura de páginas que dependem de JavaScript, instale o Chromium do Playwright e suas dependências de sistema. A coleta requer acesso às fontes e, conforme as integrações ativadas, o servidor também precisa alcançar o Ollama, o Turso e o SMTP.

Dimensione CPU e memória para o Node, a extração de PDFs e o Chromium durante as coletas. Dimensione disco para o banco local, os PDFs e as exportações. Se o Ollama rodar no mesmo servidor, inclua o consumo do modelo na medição. O repositório não fornece benchmarks de capacidade para esses cenários.

1. A partir da raiz do projeto, execute `npm install` e, para as fontes dinâmicas, `npx playwright install chromium`. Em Linux, instale também as dependências do navegador com `npx playwright install-deps chromium`.
2. Copie `.env.example` para `.env`. Configure `APP_URL` e `DATABASE_PATH` conforme o [manual de configurações](MANUAL-DE-CONFIGURACOES.md).
3. Para uma base nova, execute `npm run db:reset`. Esse comando apaga a base de destino antes de recriá-la. Para partir de uma cópia existente, use `npm run db:importar -- caminho/base.db`.
4. No Windows, execute `npm run build`. Em Linux, execute `npx vite build` e depois `npx tsc -p tsconfig.server.json`. O empacotador chamado por `npm run build` exige Windows.
5. Execute `npm start` na raiz do projeto. Abra a aplicação no navegador, faça o cadastro inicial e confira `/api/health` no endereço configurado. O servidor precisa permanecer em execução para realizar as rotinas agendadas.

A aplicação abre um servidor HTTP. Em uma implantação com proxy HTTPS, considere que a porta de escuta e os links de alertas são derivados do mesmo `APP_URL`.
