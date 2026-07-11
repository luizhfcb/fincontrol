# Cores distintas no donut e ajuste vertical do FAB

## Objetivo

Garantir que categorias diferentes nunca compartilhem a mesma cor dentro do mesmo gráfico donut e subir levemente o botão central de adição na navbar mobile.

## Diagnóstico

`Assinaturas` possui a cor fixa `#29D6FF`. Uma categoria personalizada como `Teste` usa o fallback da paleta por índice e também pode receber `#29D6FF`. A função atual resolve cada cor isoladamente e não conhece as cores já utilizadas no gráfico.

O FAB está centralizado horizontalmente, mas sua posição vertical em `bottom: 22px` o deixa muito alinhado ao centro da barra. O pedido é destacá-lo um pouco acima sem retornar ao deslocamento excessivo anterior.

## Solução aprovada

### Paleta sem colisões

- Extrair a atribuição de cores para uma função pura e testável.
- Receber a lista ordenada de nomes das categorias e o tipo do gráfico.
- Preferir a cor fixa de `CATEGORY_COLORS` quando ela ainda não foi usada.
- Ao detectar colisão, escolher a primeira cor livre da paleta correspondente.
- Se a paleta principal estiver esgotada, usar uma paleta complementar de cores distintas.
- Comparar cores sem diferenciar maiúsculas e minúsculas.
- Gerar uma única lista de cores e reutilizá-la tanto nos segmentos do donut quanto nos ícones da legenda.
- Manter a associação estável para a mesma ordem de categorias.

### Posição do FAB

- Alterar somente o override mobile final de `bottom: 22px` para `bottom: 30px`.
- Preservar o centro horizontal, o raio do menu radial e os alvos de toque.

## Testes e validação

- Criar primeiro teste unitário com `Assinaturas` e `Teste`, confirmando cores diferentes.
- Testar três categorias que disputem cores fixas e de fallback.
- Testar estabilidade da mesma entrada.
- Atualizar o teste CSS para exigir `bottom: 30px`.
- Rodar a suíte completa.
- Validar no site real em tema claro e escuro.
- Confirmar no DOM que todos os fundos de `.cat-ico` são únicos e que o `conic-gradient` contém as mesmas cores.
- Medir que o centro horizontal do FAB continua em 187,5 px no viewport de 375 px e que sua coordenada vertical subiu exatamente 8 px.

## Fora de escopo

- Alterar a paleta global das categorias.
- Mudar cores semânticas de receitas, despesas ou valores.
- Reposicionar a navbar ou modificar o raio do menu radial.
