# Auditoria final

Data da última verificação: 16/10/2026.

| Requisito | Evidência principal | Status | Verificação |
| --- | --- | --- | --- |
| Fidelidade ao Figma | `src/style.css`, `src/components/sections.tsx`, `src/components/footer.tsx`, assets em `public/figma-assets` | Concluído | Baselines desktop e mobile aprovadas |
| Home, busca, coleção, ordenação e paginação | `src/pages/home.tsx`, parâmetros tipados no TanStack Router | Concluído | Playwright em desktop e mobile |
| Detalhe, edição, quantidade, favorito e compra | `src/pages/detail.tsx` | Concluído | Playwright funcional e visual |
| Carrinho, cupom, precisão e persistência | `src/pages/cart.tsx`, `decimal.js`, handlers MSW | Concluído | Playwright funcional e visual |
| Checkout, cotação, idempotência e recibo | `src/pages/checkout.tsx`, `src/pages/orders.tsx` | Concluído | Compra confirmada e refresh testados |
| Login, cadastro, expiração, logout e troca de usuário | diálogo em `src/pages/auth.tsx`, proteção em `src/router.tsx` | Concluído | Playwright em desktop e mobile |
| Perfil e carteiras | `src/pages/profile.tsx`, `src/pages/wallets.tsx` | Concluído | Validações e conflitos testados |
| REST via Axios e cache TanStack Query | `src/api.ts`, `src/hooks.ts`, `src/query.ts` | Concluído | Typecheck e fluxos E2E aprovados |
| MSW e cenários determinísticos | `src/mock/handlers.ts`, `src/mock/store.ts`, `src/mock/fixtures.ts` | Concluído | Reset, lentidão, falhas e sessão exercitados |
| Socket.IO, versão e reconciliação | `src/hooks.ts`, `src/mock/socket.ts` | Concluído | Alteração ao vivo testada pelo cliente Socket.IO |
| Acessibilidade e responsividade | Radix Dialog, labels, foco, feedback e breakpoints | Concluído | Viewports 390 e 1440; Lighthouse 96 |
| Regressão visual | 8 imagens em `tests/marketplace.spec.ts-snapshots` | Concluído | 2 projetos Playwright aprovados |
| Qualidade estática e build | TypeScript, ESLint e Vite | Concluído | `typecheck`, `lint` e `build` aprovados |
| Lighthouse | 3 medições por rota e perfil em `lighthouse-reports` | Concluído | Todas as medianas atingem as metas |
| Deploy público e link do repositório | requer conta/projeto externo do candidato | Pendente externo | `vercel.json` e build de produção prontos |

## Resultado dos testes

- 26 execuções funcionais aprovadas: 13 cenários em Chromium desktop e os mesmos 13 em Chromium mobile.
- 2 execuções de regressão visual aprovadas, cobrindo home, detalhe, carrinho e checkout nos dois perfis (8 capturas).
- TypeScript, ESLint e build de produção concluídos sem erros.

## Lighthouse — medianas de 3 execuções

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 99 | 96 | 100 | 92 | 811 ms | 0 | 0 ms |
| Detalhe | Desktop | 96 | 96 | 100 | 92 | 708 ms | 0,119 | 0 ms |
| Home | Mobile | 90 | 96 | 100 | 92 | 3.191 ms | 0 | 15 ms |
| Detalhe | Mobile | 91 | 96 | 100 | 92 | 3.081 ms | 0 | 12 ms |

Os relatórios HTML e JSON individuais, junto do resumo reproduzível, estão em `lighthouse-reports`.
