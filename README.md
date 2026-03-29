# FinControl UI refresh

## O que mudou nesta versão

- Tela de login redesenhada, com visual mais forte e apresentação do produto.
- Tema escuro convertido para base `black / grey`, sem o roxo dominante.
- Gráfico de categorias trocado de barras para um gráfico redondo tipo donut.
- Bloco de transações recentes agora agrupado por categoria.
- Categorias do modal também aparecem no fluxo de áudio.
- Erro de login do Firebase agora mostra o código retornado no toast e no console.

## Estrutura

```text
fincontrol-ui-refresh/
├── css/
│   └── main.css
├── js/
│   ├── config/
│   │   └── firebase.js
│   ├── core/
│   │   ├── constants.js
│   │   ├── state.js
│   │   └── utils.js
│   ├── services/
│   │   ├── auth.js
│   │   ├── audio.js
│   │   ├── theme.js
│   │   └── transactions.js
│   ├── ui/
│   │   ├── categories.js
│   │   ├── feedback.js
│   │   ├── layout.js
│   │   ├── modal.js
│   │   ├── navigation.js
│   │   └── render.js
│   └── main.js
├── icon-192.svg
├── icon-512.svg
├── index.html
├── manifest.json
├── README.md
└── sw.js
```

## Arquivos principais alterados

- `index.html`
- `css/main.css`
- `js/core/constants.js`
- `js/services/auth.js`
- `js/ui/categories.js`
- `js/ui/render.js`
