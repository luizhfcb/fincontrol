# Navbar mobile centralizada e hub Mais

## Objetivo

Corrigir a largura desigual dos cards de Receitas e Despesas no tema claro e reorganizar a navegação mobile para priorizar as ações mais frequentes.

## Diagnóstico

### Cards de fluxo

A grade usa duas colunas `1fr`, mas os botões `.m-inout` mantêm a largura mínima intrínseca dos valores monetários. Com valores de comprimentos diferentes, uma coluna cresce mais que a outra e o conjunto ultrapassa a largura nominal da grade. O contraste do tema claro torna o defeito mais perceptível.

### Navbar

O FAB está ancorado à direita por overrides mobile posteriores, enquanto a barra reserva cinco posições para páginas. Categorias ocupa uma posição de primeiro nível mesmo sendo uma área administrativa menos frequente, e Transações fica separada de Início.

## Solução aprovada

### Alinhamento dos cards

- Alterar a grade para `grid-template-columns: repeat(2, minmax(0, 1fr))`.
- Aplicar `min-width: 0` e `width: 100%` aos dois `.m-inout`.
- Manter ícones, tipografia, valores completos e comportamento de filtro.
- Validar igualdade de largura no tema claro e escuro.

### Nova navbar

A barra mobile terá cinco colunas visuais:

1. Início;
2. Transações;
3. FAB centralizado;
4. Contas;
5. Mais.

O HTML terá quatro botões de navegação. O FAB ocupará visualmente a terceira coluna sem fazer parte do fluxo dos botões.

### Hub Mais

- Criar a página mobile `mp-more`.
- A página exibirá acessos claros para Categorias e Estoque.
- O botão Mais abrirá `goMPage('more')`.
- As páginas existentes `mp-limits` e `mp-stock` serão preservadas.
- Ao abrir Categorias ou Estoque, `mn-more` continuará selecionado.
- Assinaturas, Contas e demais rotas internas continuarão funcionando sem mudanças de dados.

## Acessibilidade e comportamento

- Manter alvos de toque com pelo menos 44 px.
- Preservar nomes acessíveis e estados ativos.
- O FAB continuará abrindo Entrada, Voz e Gasto.
- O menu radial será recalculado a partir do novo centro da navbar, sem alterar o raio uniforme já corrigido.
- A navegação não poderá causar overflow horizontal entre 320 e 430 px.

## Testes e validação

- Criar testes que falhem primeiro para a ordem da navbar, ausência de Categorias no primeiro nível, existência do hub Mais e mapeamento do estado ativo.
- Ampliar o teste CSS para exigir colunas `minmax(0, 1fr)`, cards sem largura mínima intrínseca e FAB centralizado.
- Rodar a suíte completa.
- Validar no site real em 375 × 812 nos temas claro e escuro.
- Medir que os dois cards tenham a mesma largura e que o centro do FAB coincida com o centro do viewport.
- Navegar por Início, Transações, Contas, Mais, Categorias e Estoque, verificando o estado ativo correto.

## Fora de escopo

- Alterar dados ou regras de negócio dos módulos.
- Remover as páginas existentes de Categorias ou Estoque.
- Redesenhar o menu radial ou os demais componentes da página inicial.
