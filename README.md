# FinControl

Controle financeiro pessoal — vanilla JS + Firebase, sem bundler. PWA com
service worker, cache local do Firestore e uso offline.

## Rodando

```bash
npm install
npm run serve        # servidor estático local
npm test             # node --test tests/*.test.mjs
npm run cache-bust   # antes de publicar (ver abaixo)
npm run backup       # dump das coleções via firebase-admin
```

Requer Node >= 20. `serviceAccountKey.json` (usado só por `npm run backup`)
nunca é commitado.

## Publicando: sempre rode `npm run cache-bust`

O projeto não tem build. `scripts/cache-bust.mjs` faz o papel do bundler:

1. calcula um hash do conteúdo de todo o CSS/JS e grava `?v=<hash>` nos
   `<link>`/`<script>` de `index.html` e em `CACHE_NAME` do `sw.js`;
2. regenera o bloco `MODULE_ASSETS:auto` do `sw.js` a partir dos arquivos em
   `js/` — sem isso, um módulo novo fica fora do precache e o app quebra
   offline sem nenhum erro visível.

`tests/sw-precache.test.mjs` falha se o `sw.js` sair de sincronia com o disco,
então o CI pega o esquecimento.

Não adicione `?v=` na mão em imports de módulo: a query escapa do cache-bust e
faz o browser baixar o mesmo arquivo duas vezes, nenhuma delas casando com o
precache.

## Estrutura

```text
fincontrol/
├── api/                        # endpoints auxiliares
├── assets/fonts/
├── css/main.css
├── scripts/
│   ├── backup.mjs
│   ├── cache-bust.mjs
│   └── sw-assets.mjs           # fonte da lista de precache do sw
├── tests/                      # node:test, sem dependências
├── js/
│   ├── config/firebase.js      # init do app, auth e Firestore com cache persistente
│   ├── core/                   # lógica pura, testável sem DOM
│   │   ├── amount-keypad.mjs
│   │   ├── constants.js
│   │   ├── dashboard-comparison.mjs
│   │   ├── dates.js
│   │   ├── escape-html.mjs
│   │   ├── feedback-validation.mjs
│   │   ├── local-date.mjs
│   │   ├── state.js            # estado global mutável do app
│   │   ├── stock-alerts.mjs
│   │   ├── subscription-sync.mjs
│   │   └── utils.js
│   ├── services/               # efeitos externos: auth, Firestore, áudio, tema
│   ├── ui/                     # renderização (render.js é o orquestrador)
│   └── main.js                 # expõe handlers em window e inicializa
├── firestore.rules
├── index.html
├── manifest.json
└── sw.js
```

## Convenções

- **`js/core/` é puro**: sem DOM, sem Firebase. É o que os testes cobrem.
  Ao consertar uma regra de negócio, extraia para `core/` e teste ali.
- **`refreshUI()` (`js/ui/render.js`) é o único ponto de re-render.** Ele já
  chama `renderModules()` no fim — não chame os dois em sequência.
- **Todo texto de usuário passa por `escapeHtml`** (`js/core/escape-html.mjs`,
  implementação única) antes de entrar em template de `innerHTML`.
- Handlers usados por `onclick=` no HTML precisam estar em `window` — o
  registro fica todo em `js/main.js`.

## Dados

- `transactions/{docId}` — uma transação por doc, escopada por `uid`.
  O listener usa janela deslizante de 12 meses.
- `modules/{uid}` — um doc por usuário com limites, assinaturas, contas,
  estoque e categorias. Espelhado em `localStorage` só como cache.

Regras de acesso em `firestore.rules`: cada usuário só lê e escreve o próprio
`uid`, e `update` não pode reatribuir um doc para outro dono.
