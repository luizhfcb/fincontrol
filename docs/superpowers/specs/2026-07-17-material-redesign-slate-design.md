# Redesign Material (estilo Nubank) — superfícies grafite + acento azul

## Objetivo

Dar ao mobile uma cara de app financeiro nativo estilo Material Design 3 / Nubank: superfícies planas e neutras, um único acento forte, forma e movimento consistentes. Sai o dark "azul total" (navy em tudo); entra grafite frio com azul aplicado só onde há significado.

Referências visuais: Nubank (superfícies quase neutras, acento único dominante, cards planos com hairline, listas com ícone circular + chevron), Material Design 3 (bottom nav com indicador ativo, FAB squircle, state layers, escala tipográfica, tokens de motion).

## Pré-requisito

O working tree contém a camada "brand teal + empty states + skeletons" não commitada. **Commitar antes de iniciar** — ela é a baseline deste plano (os tokens `--brand`, `--r-*`, `--surface-*` criados lá serão reaproveitados e retargetados).

## Diagnóstico

1. **Dark "azul total".** Fundo `#07111d`, cards `#101b2c`→`#17293f`, hero navy→indigo — tudo azul. Não existe neutro; o acento não tem contra o que contrastar.
2. **Gradientes e glows em excesso.** Hero com radial teal + gradiente triplo, cards com `--surface-card` em gradiente, barras com gradiente, FAB com halo duplo. Material/Nubank = superfície chapada, elevação discreta.
3. **Sem linguagem de componente Material.** Bottom nav sem indicador ativo (só cor), FAB circular clássico, sem ripple/state layer, sem escala de motion.
4. **8 camadas de CSS empilhadas** (8008 linhas) com `!important` disputando. O redesign é a oportunidade de matar as camadas mortas.

## Paleta aprovada (implementada — "Dark Clássico")

Usuário pediu: dark mais **cinza e azul**, não azul total. Acento único azul; teal aposentado. A implementação assentou em preto OLED + cinzas foscos (não o grafite #0F1114 do rascunho original) — mantida por decisão.

### Dark (preto/cinza fosco + azul elétrico)

```css
--bg:#000000;  --bg2:#121212;  --bg3:#1a1a1a;
--card:#1E1E1E;   /* superfície de card, chapada */
--card2:#272727;  /* superfície elevada (chips, inputs) */
--border:#333333;
--text:#FFFFFF;  --text2:#A0A0A0;  --text3:#8C8C8C; /* ≥4.5:1 sobre card */
--brand:#0099FF;  --brand-strong:#0066FF;  --brand-soft:rgba(0,153,255,.14);
--fin-green:#4ADE80;  --fin-red:#F87171;
```

### Light (neutro claro)

```css
--bg:#f4f6f9;  --card:#FFFFFF;
--brand:#0066FF;  --brand-strong:#004ECC;  --brand-soft:rgba(0,102,255,.10);
--fin-green:#0A8F4E;  --fin-red:#C41C1C;
```

Hero: dark flat (superfície sólida, valores coloridos); light mantém o cartão azul "signature" em gradiente da marca (`#0A84FF→#0066FF→#004ECC`, texto branco, pills em vidro) — decisão do usuário, o azul dá destaque. `--r-card:16px` unificado. `--brand-on:#fff`.

Verde/vermelho continuam exclusivos de semântica financeira (receita/despesa). Azul = navegação, seleção, foco, CTA.

## Linguagem visual

### Superfícies (Material flat)

- Cards: cor sólida `--card`, hairline `--border`, sombra única discreta (`0 1px 3px rgba(0,0,0,.24)` dark / `0 1px 3px rgba(15,23,42,.08)` light). **Zero gradiente, zero glow, zero inset highlight.**
- Hero do saldo: card plano `--card` com label em `--brand`, saldo em `--text`, pills receita/despesa com fundo `--brand-soft`-like tonal (`--fin-green/red` a 12%). Sem cartão-gradiente.
- Elevação por camada tonal (`--card` → `--card2`), não por sombra grande.

### Forma

- Raios já tokenizados: `--r-card:24px` → **reduzir para 16px** (Material 3 card), `--r-control:12px`, `--r-pill:999px`, sheets/modais `28px` no topo.
- FAB: squircle Material 3 — `border-radius:16px`, 56×56, fundo `--brand`, ícone branco, sombra nível 2. Sem halo.
- Bottom nav: indicador ativo Material — pílula `--brand-soft` atrás do ícone (não do botão inteiro), label sempre visível, ícone ativo preenchido.

### Movimento

- Tokens: `--ease-emphasized:cubic-bezier(.2,0,0,1)`, `--ease-standard:cubic-bezier(.2,0,.2,1)`; durações 150/250/400ms.
- Ripple/state layer nos toques (nav, pills, cards de lista, teclado do modal): utilitário JS pequeno (pointerdown → span radial, ~450ms) + `:active` tonal como fallback.
- Donut mantém animação de desenho; barras de análises passam a crescer com `--ease-emphasized`.
- `prefers-reduced-motion`: ripple e transições desligados.

### Tipografia

- Poppins mantida (já local). Escala fixa: 11 / 13 / 15 / 17 / 22 / 34. Pesos: 400 corpo, 600 rótulos, 700 títulos, 800 valores. Menos 850/900.

## Escopo por tela (mobile)

- **Home:** hero plano, donut/legenda sobre card plano, recentes em lista Material (ícone circular tonal + duas linhas + valor).
- **Análises:** filtro de período como segmented Material (trilho `--card2`, ativo `--brand` sólido), barras sólidas `--brand`, cards planos, marcadores laterais de seção removidos (hierarquia por tipografia).
- **Transações / Mais / módulos:** herdam tokens automaticamente; hub Mais vira lista Material com chevron.
- **Correções pendentes absorvidas:** empty-guided nos re-renders (helper JS único), skeleton no primeiro paint da home, pills do hero com semântica de cor nos dois temas, FAB sem anel duplo, análises light sem azul antigo hardcoded.

## Limpeza estrutural (parte do escopo)

Remover camadas mortas do `main.css`: bloco executive antigo (linhas ~172–348), redesign verde light (~2000–2715), hero azul royal (~7253–7319), camada teal (~7772–7844), polish navy (~7663–7770), `.m-summary-card`/`.m-home-headline`/`.m-inout-row` (HTML não usa). Meta: mobile styles consolidados em um bloco tokenizado, arquivo reduzido em ≥25%, `!important` só onde houver conflito real com desktop.

## Fora de escopo

- Desktop (ganha só os tokens de cor compartilhados; layout intacto).
- Dados, Firestore, regras de negócio.
- Troca de fonte ou de ícones (SVGs stroke atuais já são Material-like).
- Login screen.
