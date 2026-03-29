# FinControl refatorado

## O que foi reorganizado

- `index.html` ficou focado só na estrutura da interface.
- `css/main.css` concentra todo o estilo visual.
- `js/` foi separado por responsabilidade:
  - `config/` para Firebase
  - `core/` para constantes, estado global e utilitários
  - `services/` para autenticação, tema, áudio e persistência
  - `ui/` para renderização, modal, navegação, feedback e layout
- `manifest.json` e `sw.js` foram mantidos, mas ajustados para caminhos relativos e cache dos arquivos estáticos principais.

## Estrutura

```text
fincontrol-refatorado/
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

## Observação

A interface foi mantida visualmente próxima do layout original. A mudança principal foi estrutural, para facilitar manutenção e evolução do projeto.
