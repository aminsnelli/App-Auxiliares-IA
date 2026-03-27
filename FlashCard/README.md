# Codex Words

Aplicativo offline para PC, feito em HTML, CSS e JavaScript, para cadastrar grupos de palavras e estudar com audio.

## Recursos atuais

- Cadastro e exclusao de grupos
- Cadastro e edicao de palavras com portugues, ingles, fonetica e audio gravado
- Estudo manual com grupos escolhidos por voce
- Estudo automatico inteligente com peso dinamico
- Modo de revisao focado em erros recentes
- Campo para responder digitando e confirmar com Enter
- Marcacao de confianca da resposta
- Timer por pergunta
- Repeticao adaptativa dentro da rodada para palavras dificeis
- Placar da rodada
- Dashboard com metricas por palavra
- Reset geral de estatisticas e reset por palavra monitorada
- Controle de quantas aparicoes entram no calculo do percentual de acerto
- Streak de dias consecutivos com meta diaria configuravel

## Aprendizagem adaptativa

- Se voce errar, responder com duvida ou demorar muito, a palavra volta mais cedo na mesma rodada.
- O acerto de cada palavra usa apenas as ultimas N respostas.
- Esse N pode ser alterado no dashboard.
- O valor padrao e 20.

## Como funciona a aparicao no automatico

- Antes de 3 dias, a palavra continua com peso cheio.
- Depois de 3 dias, o peso so comeca a cair se a palavra estiver em 100% de acerto dentro da janela escolhida.
- Depois de entrar em 100%, ela ainda precisa acumular mais 10 acertos para a aparicao comecar a cair.
- Se voltar a errar, o peso sobe novamente.
- A taxa nunca chega a zero. O peso minimo fica travado acima disso.

## Como usar

1. Abra `index.html` no navegador ou execute `abrir_app.bat`.
2. Permita o uso do microfone quando o navegador pedir.
3. Na aba `Cadastro`, crie grupos e adicione ou edite palavras.
4. Na aba `Estudo`, escolha entre manual, automatico ou revisao de erros.
5. Defina a meta de acertos e o limite maximo de tentativas da rodada.
6. Digite a resposta, marque sua confianca e pressione Enter.
7. Na aba `Dashboard`, ajuste a janela do acerto, a meta diaria e acompanhe as metricas e o streak.

## Observacoes

- Os dados ficam salvos localmente no navegador.
- Se os dados do navegador forem limpos, os grupos, metricas e audios podem ser apagados.
