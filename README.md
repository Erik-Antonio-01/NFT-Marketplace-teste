# Kurio — NFT Marketplace

Implementação em React + TypeScript do desafio de marketplace de NFTs, reproduzindo os frames desktop e mobile do Figma. As quatro artes exibidas foram extraídas do próprio arquivo do Figma e ficam em `public/figma-assets`; versões WebP derivadas desses originais são servidas para reduzir o LCP.

A home inclui os destaques, catálogo, banners editoriais, Diário da Cunhagem e o rodapé completo do layout. Detalhe e carrinho exibem recomendações com os mesmos assets. Login e cadastro abrem em diálogo sobre a tela atual e retornam ao fluxo protegido solicitado depois da autenticação.

## Executar

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Os mocks são ativados por padrão. Para usar uma API externa, execute com `VITE_ENABLE_MOCKS=false`.

Credenciais fictícias:

- `alex@example.com` / `demo12345`
- `sam@example.com` / `demo12345`
- cupom válido: `KURIO10`

## Comandos

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run audit
```

## Cenários dos mocks

O estado completo é reiniciado por `POST /api/demo/reset`. Um cenário pode ser selecionado com `POST /api/demo/scenario`, corpo `{ "scenario": "..." }`.

Valores disponíveis: `default`, `slow`, `out-of-order`, `offline`, `server-error`, `favorite-fail`, `session-expired`, `payment-declined` e `timeout-order`. Alterações em tempo real são disparadas por `POST /api/demo/nft-change` e chegam à interface via Socket.IO.

## Contratos principais

- Sessão: `GET /api/auth/session`, `POST /api/auth/login`, `/register`, `/logout`.
- NFTs: `GET /api/nfts`, `GET /api/nfts/:id`.
- Favoritos: `GET /api/favorites`, `POST|DELETE /api/favorites/:id`.
- Carrinho: `GET|POST /api/cart`, `PATCH|DELETE /api/cart/:itemKey`.
- Cotação: `POST /api/quote`, `POST /api/coupons/validate`.
- Pedidos: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`.
- Conta: `GET|PATCH /api/profile`, `PATCH /api/profile/password`, `GET|POST /api/wallets`, `PATCH /api/wallets/:id`.
- Eventos Socket.IO: `nft.updated` e `order.updated`, ambos com identidade do recurso e versão monotônica.

Os testes Playwright isolam o estado antes de cada caso e cobrem desktop e mobile. O build de demonstração mantém MSW, REST e Socket.IO ativos e `vercel.json` oferece fallback das rotas para a SPA.

## Persistência e limitações

- Sessão, carrinho, favoritos, perfil, carteiras, pedidos e cenários de mock persistem localmente para suportar refresh.
- O cadastro de interesse em lançamentos valida o e-mail e o salva apenas neste navegador; não há serviço externo de newsletter no escopo.
- Google, Facebook, blockchain, extensões de carteira e gateway de pagamento são controles visuais ou simulações e não indicam integração real.
- O deploy público precisa ser executado no provedor escolhido. A configuração de fallback para Vercel já está incluída.
