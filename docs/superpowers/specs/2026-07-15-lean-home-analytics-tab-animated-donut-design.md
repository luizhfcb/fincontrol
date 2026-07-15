# Home enxuta, aba Análises e donut animado

## Objetivo

Reduzir a densidade da home mobile para leitura em um relance (saldo + gastos por categoria + transações recentes), concentrar todos os relatórios em uma nova aba Análises e dar vida ao gráfico de categorias com animação de desenho sequencial.

Referências visuais: dashboard fintech dark (donut compacto com legenda percentual + transações recentes) e tela Analytics (total do período com delta, filtro de período, gasto diário em barras e breakdown por categoria com barras de progresso). Animação do donut inspirada no pin "Base Bank App Monthly Stats Infographics".

## Pré-requisito

O working tree contém uma modificação não commitada em `index.html` que **reverte** o commit `d4e99d8` (topo mobile, seletor de mês, navbar com hub Mais) e inclui lixo de digitação (`</div>/voce`). Essa modificação deve ser descartada antes de iniciar. Baseline oficial: `HEAD`.

## Diagnóstico

### Home sobrecarregada

`mp-home` empilha hoje: hero executivo (saldo + badge delta + comparação + cards Receitas/Despesas + barra de fluxo), donut escondido atrás de collapse, mapa de calor, gasto por dia da semana, tendência 6 meses, mini stats e limites. O usuário rola quatro telas para ver tudo; o conteúdo analítico compete com o resumo do dia a dia.

### Donut invisível e estático

O gráfico de categorias — informação mais consultada — nasce colapsado (`collapse-shell collapsed`) e usa `conic-gradient`, que não permite animar a abertura das fatias.

### Sem transações recentes na home

Conferir os últimos lançamentos exige trocar de aba.

## Solução aprovada

### Fase 1 — Home enxuta

**Hero mínimo:**

- Mantém: seletor de mês, seletor de visão, saldo grande + botão de privacidade.
- Cards Receitas/Despesas viram **pills inline em uma linha** (ícone + valor, verde/vermelho), mantendo o toque que troca a visão (`setDashView`).
- Saem da home (migram para Análises): badge de delta, texto de comparação, barra de fluxo.

**Donut compacto sempre visível:**

- Sem collapse. Card "Gastos por Categoria" com donut à esquerda (total no centro) e legenda à direita: ponto de cor + nome + percentual.
- Valores por categoria completos ficam no breakdown da aba Análises.

**Transações recentes:**

- Nova seção com as 5 últimas transações do mês e botão "Ver todas" que abre `mp-transactions`.
- Reutiliza a renderização de linha de `tx-list.js`.

**Saem da home:** mapa de calor, gasto por dia da semana, tendência 6 meses, mini stats, limites — tudo migra para Análises. Home final: hero + donut + recentes.

### Fase 2 — Aba Análises

**Navegação:**

- Nova página `mp-analytics`.
- Navbar passa a `Início · Transações · FAB · Análises · Mais`.
- Contas migra para o hub Mais (junto de Categorias e Estoque); `morePages` em `navigation.js` ganha `bills`.

**Conteúdo (ordem de cima para baixo):**

1. Header: total gasto do período + badge delta vs período anterior (`dashboard-comparison.mjs`) + receitas/saldo secundários + barra de fluxo (movida da home).
2. Filtro de período: `Semana · Mês · Ano` (estado `state.analyticsPeriod`, padrão `month`). Afeta header, gasto diário e breakdown; mapa de calor e gasto por dia da semana continuam mensais.
3. Gasto diário em barras (dias do período).
4. Breakdown por categoria: linha com ícone, nome, valor, percentual e barra de progresso proporcional.
5. Mapa de calor (movido, mesmo id `mExpenseHeatmap`).
6. Gasto médio por dia da semana e tendência 6 meses (movidos, mesmos ids).
7. Mini stats (dias ativos, média diária, registros, maior gasto — movidos).
8. Limites — Situação (movido).

Os containers movidos preservam os ids atuais; `render.js` continua funcionando sem mudanças de dados.

### Fase 3 — Donut animado

- Substituir `conic-gradient` por **SVG**: cada fatia é um arco com `stroke-dasharray`/`stroke-dashoffset` animado, com atraso escalonado — fatias desenham em sequência.
- Total no centro com count-up via `requestAnimationFrame` (~700 ms).
- Toque/Enter na fatia destaca (stroke mais largo) e mostra categoria + valor.
- Cores continuam vindas de `assignDistinctDonutColors` (`chart-colors.mjs`).
- `prefers-reduced-motion: reduce`: renderização estática, sem sweep nem count-up.
- Desktop (`dBarChart`) recebe o mesmo markup SVG; layout desktop inalterado.

## Acessibilidade e comportamento

- Pills e fatias com alvos de toque ≥ 44 px, `aria-label` e navegação por teclado.
- Filtro de período como `radiogroup` com estado `aria-checked`.
- Estado ativo da navbar: Análises destaca `mn-analytics`; Contas, Categorias, Assinaturas e Estoque destacam `mn-more`.
- Sem overflow horizontal entre 320 e 430 px.
- Privacidade (`.priv`) continua valendo para todos os valores novos.

## Testes e validação

- Testes vermelhos primeiro (`node:test`), no padrão dos existentes: contratos de layout da home, ordem da navbar, existência de `mp-analytics`, hub Mais com Contas, containers movidos e donut SVG.
- Rodar suíte completa após cada fase.
- Validação no site real em 375 × 812, temas claro e escuro, incluindo animação do donut e `prefers-reduced-motion`.

## Fora de escopo

- Redesenho do dashboard desktop (segue com a home atual).
- Mudanças em dados, Firestore ou regras de negócio.
- Novos tipos de gráfico além dos descritos.
- FAB e menu radial.
