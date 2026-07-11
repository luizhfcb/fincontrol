# Correção mobile: FAB radial e proporção das transações

## Objetivo

Corrigir dois problemas visuais em telas mobile sem alterar a identidade atual do FinControl:

1. alinhar geometricamente as três ações do menu radial do FAB;
2. impedir que resumos, cabeçalhos e valores da tela de transações ultrapassem ou sejam cortados pelo viewport.

O resultado deve funcionar entre 320 px e 430 px de largura, com validação principal em 375 × 812 px. Valores monetários permanecerão completos, sem abreviação.

## Diagnóstico

### Menu radial

As posições atuais usam deslocamentos manuais que também compensam a altura dos rótulos. Como botão e rótulo participam do mesmo bloco transformado, o centro visual da ação “Gasto” não permanece no mesmo eixo horizontal do FAB principal e o arco parece irregular.

### Tela de transações

O resumo, os totais diários e os valores das linhas combinam `white-space: nowrap`, itens flexíveis sem espaço suficiente para encolher e paddings fixos. Em viewports estreitos, a largura mínima combinada excede o espaço disponível e expande o conteúdo horizontalmente, cortando a borda direita.

## Solução aprovada

### Geometria do FAB

- Manter o menu radial e o backdrop atuais.
- Posicionar cada ação a partir do centro do respectivo botão, sem usar a altura do rótulo para compensar o `translate`.
- Usar três pontos de um quarto de círculo: Entrada acima, Voz na diagonal e Gasto à esquerda.
- Fazer o centro de “Gasto” compartilhar o eixo horizontal do FAB principal.
- Centralizar cada rótulo sob seu próprio botão sem alterar a geometria do arco.
- Preservar tamanho dos alvos de toque, cores semânticas, animação e suporte a `prefers-reduced-motion`.

### Proporção da tela de transações

- Manter valores monetários completos e com numerais tabulares.
- Permitir que o resumo passe para duas linhas em larguras estreitas: contagem acima e fluxos abaixo.
- Distribuir os fluxos de entrada e saída sem criar largura mínima maior que o viewport.
- Permitir que o título e a categoria da transação cedam espaço primeiro, com truncamento por reticências.
- Reduzir de forma localizada fonte, gap e padding de valores apenas nos menores breakpoints, mantendo legibilidade.
- Evitar overflow horizontal no conteúdo da página sem esconder um overflow estrutural ainda existente.
- Manter o agrupamento, swipe, filtros, navegação inferior e FAB funcionalmente inalterados.

## Testes e validação

- Criar primeiro um teste de regressão que verifique a presença dos contratos CSS responsáveis pela geometria e pela contenção responsiva; confirmar que ele falha antes da implementação.
- Rodar a suíte completa após a correção.
- Validar no navegador em 320 × 800, 375 × 812 e 430 × 932 px.
- Em 375 × 812, capturar previews da tela de transações e do menu FAB aberto.
- Confirmar visualmente que nenhum elemento é cortado à direita, que valores permanecem completos e que os centros dos botões formam um arco regular.
- Conferir tema claro e escuro e ausência de erros no console.

## Fora de escopo

- Alterar a linguagem visual geral do app.
- Abreviar valores monetários.
- Trocar o menu radial por uma lista vertical.
- Refatorar componentes ou estilos não relacionados aos dois defeitos.
