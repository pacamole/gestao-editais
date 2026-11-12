# Manual de configurações do Gestor de Editais I9+

[Manuais](MANUAIS.md)

Abra **Configurações** no menu lateral. Cada seção abaixo corresponde a uma opção da interface.

## Perfil da empresa

| Campo ou botão | Efeito |
| --- | --- |
| **Razão social**, **Nome fantasia** e **CNPJ** | Identificam a empresa no perfil usado pela triagem. |
| **CNAE principal** e **CNAEs secundários** | Registram as atividades econômicas usadas nas comparações com os CNAEs aceitos. |
| **Porte** e **Natureza jurídica** | Informam a classificação e a forma jurídica da empresa para comparação com as condições de participação. |
| **Data de fundação** | Permite calcular o tempo de existência da empresa no momento da avaliação. |
| **Faturamento anual** | Fornece a referência para comparar faixas de faturamento. |
| **Estado** e **Município** | Identificam a localização da empresa para avaliar requisitos geográficos. |
| **Link da página da empresa** | Define o endereço público inicial para a busca de evidências na triagem. |
| **Áreas de atuação** e **Palavras-chave** | Descrevem a atuação da empresa e oferecem referências para critérios temáticos e comparações com o texto do edital. |
| **Certidões disponíveis** | Registra os documentos que a empresa informa possuir para comparar com as certidões exigidas. |
| **Capacidade de contrapartida (%)** | Indica o percentual que a empresa pode oferecer quando o edital exigir contrapartida. |
| **Valor mínimo de interesse** | Define uma referência financeira para os critérios que usam esse campo. |
| **Prazo mínimo de preparo (dias)** | Define a antecedência de que a equipe precisa. Em comparações de datas, a referência é a data atual acrescida dos dias informados. |
| **Possui parceria com instituição de pesquisa** | Indica se a empresa dispõe de parceria para critérios que considerem essa exigência. |
| **Instruções extras** | Acrescenta contexto fornecido pela empresa à triagem por IA. |
| **Reavaliar todos os editais ativos com o novo perfil** | Solicita a reavaliação dos editais ativos ao salvar. |
| **Salvar perfil** | Grava os dados, limpa as conversas existentes do chat e executa a reavaliação se a opção estiver marcada. |

## Critérios e pesos

| Campo ou botão | Efeito |
| --- | --- |
| **+ Novo critério** | Abre o formulário com o tipo correspondente à seção em que o botão foi acionado. |
| **Eliminatório** | Define uma condição de participação. A reprovação em uma regra eliminatória pode tornar o edital inelegível. |
| **Pontuável** | Define uma condição que contribui para o fit de um edital elegível. |
| **Nome** | Identifica o critério na lista e nos resultados. |
| **Qual dado do edital?** | Seleciona o campo a avaliar, como prazo, valor, lista de requisitos ou texto do documento. |
| **Qual regra?** | Seleciona a comparação entre o dado do edital e a referência. Os operadores disponíveis dependem do tipo do campo. |
| **Comparar com o quê?** | Seleciona um campo compatível do perfil ou um valor fixo, quando oferecido. **Valor** fornece a referência fixa. |
| **A empresa também atende se tiver…** | Adiciona uma condição alternativa do perfil nas regras em que essa opção aparece. |
| **Peso** | Define a contribuição relativa do critério pontuável, de 1 a 10. Um peso maior aumenta sua influência na nota. |
| **Motivo mostrado quando reprovar** | Define o texto exibido para a reprovação em um critério eliminatório. |
| **Usar este critério na avaliação** | Determina se o critério participa das avaliações. |
| **Adicionar critério / Salvar alterações** | Cria a regra ou grava as alterações da regra existente. **Cancelar** fecha o formulário sem gravar. |
| **⋯ › Editar / Ativar / Desativar / Excluir** | Abre a regra para edição, inclui ou retira a regra das avaliações, ou remove o cadastro. |
| **Testar** | Simula a avaliação para o edital selecionado e apresenta o resultado da aplicação das regras. |

**É igual a** e **É diferente de** comparam os valores. **É maior ou igual a** e **É menor ou igual a** incluem o limite. **Tem faixa que inclui** verifica se a referência pertence à faixa de faturamento indicada pelo edital. **Contém** e **Não contém** verificam presença ou ausência em lista ou texto. **Não restringe ou contém** aceita uma lista vazia ou a presença da referência. **Tem item em comum com** exige pelo menos um item em comum. **Está contido em** exige que os itens do edital estejam na referência. **É verdadeiro** exige a condição afirmativa. **É falso (ou a empresa atende)** aceita a ausência da exigência ou a condição alternativa indicada no perfil.

## Fontes monitoradas

| Campo ou botão | Efeito |
| --- | --- |
| **Termos excludentes (um por linha)** | Define os termos usados pelo filtro para classificar oportunidades fora do perfil. |
| **Dias para expirar edital sem prazo definido** | Define o limite de inatividade para expirar um edital ativo sem prazo. O padrão é 60 dias e o intervalo aceito é de 1 a 3.650. |
| **Salvar filtro** | Grava os termos e o período de expiração. |
| **+ Adicionar fonte** | Abre o cadastro de uma fonte. |
| **Nome** e **Endereço da página de editais** | Identificam a fonte e definem o endereço consultado. |
| **Horário da busca diária** e **Buscar editais nesta fonte** | Definem o horário da rotina, no fuso de Brasília, e se a fonte participa da coleta automática. |
| **Verificar página** | Testa o endereço informado e apresenta o resultado da leitura. |
| **Tentar achar a fonte dos editais neste link** | Procura uma página de listagem a partir do endereço informado. **Usar este endereço** preenche o formulário com o endereço sugerido. |
| **Adicionar de forma avulsa** | Cadastra a publicação detectada como entrada individual. |
| **Adicionar fonte / Salvar alterações** | Grava o cadastro novo ou a edição da fonte. **Cancelar** fecha o formulário sem gravar. |
| **⋯ › Buscar agora** | Solicita coleta imediata para a fonte escolhida. |
| **⋯ › Alterar horário** | Abre a edição do horário de uma fonte integrada. **Salvar** aplica a alteração. |
| **⋯ › Pausar / Retomar** | Desativa ou reativa a coleta programada da fonte. |
| **⋯ › Editar / Excluir** | Edita ou remove uma fonte adicionada. |

## Alertas e destinatários

O interruptor de cada alerta controla sua ativação. Clique no nome para abrir os parâmetros. **Todos da lista** usa a lista de destinatários cadastrados. **Escolher** permite selecionar um subconjunto. **Gerenciar lista** abre a seção **Destinatários**.

| Alerta | Parâmetro e efeito |
| --- | --- |
| **Novo edital com fit alto** | Nota mínima de 0 a 100. O padrão é 70. Aplica-se a novos editais elegíveis que atinjam a nota. |
| **Prazo próximo** | Dias de antecedência entre 1 e 90. Os padrões são 15, 7 e 2 dias. Inclua os dias no campo e remova cada valor pelo controle correspondente. |
| **Verificação necessária** | Avisa quando um critério precisa de verificação. Possui opções de ativação e destinatários. |
| **Resumo semanal** | Dia da semana e horário da rotina. O padrão é segunda-feira às 08:00. |
| **Edital retificado** | Variação de nota entre 1 e 100 pontos. A regra dispara quando a variação ultrapassa o valor configurado, cujo padrão é 10. |
| **Falha de coleta** | Quantidade de falhas consecutivas da mesma fonte, de 1 a 20. O padrão é 2. |

**Salvar tudo** grava as alterações dos alertas. **Descartar** desfaz as alterações pendentes. **Simular envio** envia uma mensagem de exemplo aos destinatários da simulação com SMTP ativo, ou a registra no terminal com SMTP desligado. **Histórico de envios** permite filtrar pelo tipo de alerta e pelas opções **Todos**, **Enviados** e **Falhas**.

Em **Destinatários**, **Adicionar** inclui o endereço digitado na lista, **Buscar e-mail** filtra os endereços exibidos e **Remover** retira o endereço selecionado da lista.

## E-mail (SMTP)

| Campo ou botão | Efeito |
| --- | --- |
| **Desligado** | Desativa o envio por SMTP. Os envios passam a ser registrados no terminal. |
| **Gmail** / **Outlook / Hotmail** | Selecionam os endereços e portas predefinidos no sistema. |
| **Outro** | Permite informar **Servidor SMTP** e **Porta** manualmente. |
| **E-mail que envia os alertas** | Define a conta usada para autenticar o envio e o endereço do remetente. |
| **Senha de app** | Fornece a credencial de autenticação SMTP aceita pelo provedor. |
| **Nome exibido no remetente** | Define o nome que acompanha o endereço nos e-mails enviados. |
| **Salvar** | Grava a configuração do provedor e do remetente. |
| **Enviar para** e **Enviar e-mail de teste** | Definem o destino e enviam uma mensagem de teste usando a configuração salva. |

## Inteligência artificial

| Campo ou botão | Efeito |
| --- | --- |
| **Neste computador** | Abre a configuração do modo local. **Usar este computador** ativa o modo. O servidor usa o modelo fixo `gemma2:latest`. |
| **Endereço do Ollama** | Define o serviço local ou de rede consultado pelo servidor. O padrão é `http://localhost:11434`. **Testar** verifica a conexão e o modelo. **Salvar** grava o endereço. |
| **Ollama Cloud** | Abre a configuração do serviço em nuvem. **Chave de API** autentica o acesso e **Modelo** define o modelo usado. **Conferir chave** consulta os modelos disponíveis. |
| **Salvar e usar o Ollama Cloud / Salvar** | Ativa o modo em nuvem ou atualiza as opções já em uso. |
| **Perguntas por usuário por dia** | Limita o uso diário do chat por usuário. O padrão é 20 e o intervalo aceito é de 1 a 500. O botão **Salvar** dessa seção aplica o novo limite. |

## Base de dados

| Campo ou botão | Efeito |
| --- | --- |
| **Neste computador / Na nuvem (Turso)** | Exibem os controles de cada opção. A indicação **em uso** identifica a conexão ativa. |
| **Usar a base deste computador / Voltar a usar só este computador** | Troca a conexão ativa para a base SQLite local. |
| **URL do banco** e **Token** | Identificam a base Turso e autorizam o acesso. |
| **Testar conexão** | Verifica as credenciais e a compatibilidade da base e informa se há dados. |
| **Enviar os dados deste computador / Começar vazia** | Quando o destino está vazio, escolhem se a base remota receberá os registros locais ou será inicializada sem eles. |
| **Usar a base na nuvem** | Ativa a conexão Turso com a opção escolhida. **Reconectar** repete a conexão remota já configurada quando disponível. |
| **Baixar base** | Baixa uma cópia SQLite da base ativa. |
| **Seleção de arquivo / Trocar** | Seleciona ou substitui o arquivo de importação antes de aplicar a operação. |
| **Substituir os dados deste computador / Substituir os dados da nuvem / Restaurar** | Substituem os dados da base ativa pelo arquivo selecionado ou pelo backup indicado. A operação pede confirmação, cria uma cópia da base anterior e exige novo login. |

## Parâmetros do servidor

| Variável | Efeito |
| --- | --- |
| `APP_URL` | Define o endereço usado nos links dos e-mails e a porta de escuta da aplicação. O padrão é `http://localhost:3000`. Sem porta explícita, o código usa 80 para HTTP e 443 para HTTPS. |
| `DATABASE_PATH` | Define o caminho do SQLite local. O padrão é `data/editais.db`, relativo à raiz de dados da instalação. |
| `NODE_ENV` | O comando `npm start` define `production` e o servidor entrega os arquivos da interface compilada. O modo de desenvolvimento usa o Vite. |

Reinicie o processo após alterar o arquivo `.env`. Consulte o [manual de uso](MANUAL-DE-USO.md) para os comandos de implantação.
