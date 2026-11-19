# FinControl Web (React + Firebase)

Front-end em React do FinControl — controle financeiro pessoal e compartilhado (Modo Família), com tema claro/escuro, privacidade, gráficos avançados e sincronização opcional com o Firebase do projeto original (`luizhfcb/fincontrol`).

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173 (modo demonstração por padrão)
npm test         # node --test (regras de negócio)
npm run build
```

## Conectando ao Firebase real (Auth Google + Firestore + Modo Família)

1. Crie um arquivo `.env` a partir de `.env.example`:
   ```env
   VITE_USE_FIREBASE=true
   ```
2. Publique as regras atualizadas do arquivo `firestore.rules` no projeto Firebase (`fincontrol-9db2c`):
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Reinicie `npm run dev` (ou faça `npm run build` para deploy). O login passa a usar **Google Auth** e todas as transações, metas, módulos e carteiras compartilhadas sincronizam em tempo real via Firestore.

### Retrocompatibilidade
- Transações antigas sem `walletId` são tratadas automaticamente como da carteira **Pessoal** (`w-pessoal`).
- No **Modo Família** (`/mais/compartilhamento`), qualquer membro gera um código curto (`FAM-XXXX`) e a outra pessoa entra direto no grupo usando a própria conta Google.

## Stack
Vite · React 18 · React Router · Recharts · Firebase v10/11 (Auth + Firestore com cache offline)

## Estrutura
```text
src/
├── config/      # firebase.js (Auth + Firestore com persistentLocalCache)
├── core/        # regras puras (analytics, insights, family, dates, format...)
├── services/    # index.js alterna entre mockApi.js (demo) e firebaseApi.js (real)
├── context/     # AppContext (estado global, tema, privacidade, listeners em tempo real)
├── pages/       # Home, Transactions, Analytics, More, Goals, Shared, Modules, Login
└── components/  # Layout, DonutChart, ExpenseHeatmap, TxModal, TxHistoryModal, TxRow, MonthBar
```
