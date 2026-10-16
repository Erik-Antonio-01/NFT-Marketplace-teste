# Arquitetura

## Organização

A interface usa TanStack Router para rotas e parâmetros de catálogo, TanStack Query para cache e mutations, Axios para todos os contratos REST e MSW para o backend simulado. O estado persistente dos mocks fica no `localStorage`, separado da sessão e das preferências temporárias do checkout.

Os componentes não acessam fixtures diretamente. Eles consomem `src/api.ts`; os handlers em `src/mock/handlers.ts` aplicam validações, disponibilidade, autenticação, idempotência e cenários de falha. Valores monetários trafegam como strings e são calculados com `decimal.js`.

## Cache e sessão

As chaves do catálogo incluem busca, coleção, ordenação, página e preço máximo. Carrinho, favoritos, carteiras e pedidos são invalidados após mutations e eventos relevantes. Favoritar usa atualização otimista com rollback. Login combina o carrinho visitante ao carrinho da conta; logout e expiração limpam caches privados.

O checkout gera uma chave de idempotência por tentativa. Antes do envio, uma nova cotação é comparada ao fingerprint revisado. Em timeout, a lista de pedidos é consultada para recuperar a operação já criada sem duplicá-la.

Login e cadastro são diálogos Radix globais. Rotas legadas (`/login` e `/register`) e tentativas de acesso privado registram o destino em `sessionStorage`, retornam à home e abrem o diálogo sem criar uma página paralela ao Figma. Ao autenticar, o fluxo retoma esse destino. Respostas `401` só encerram a sessão quando pertencem ao token ainda ativo, evitando que uma resposta atrasada da conta anterior apague uma sessão recém-criada.

## Tempo real

O navegador conecta `socket.io-client` a `ws://kurio.local/socket.io/`. Um `WebSocketInterceptor` do MSW e `@mswjs/socket.io-binding` implementam o transporte Engine.IO/Socket.IO no próprio browser. Eventos antigos ou duplicados são ignorados por versão. Na conexão ou reconexão, recursos ativos são reconciliados com REST. A limitação intencional é que o transporte existe apenas no ambiente de mocks e não representa um servidor de rede real.

## Figma e responsividade

As telas reproduzem a identidade Kurio, a composição marrom/laranja, tipografia monoespaçada, textos, nomes e artes disponíveis no Figma. O catálogo desktop acrescenta somente a seleção por coleção solicitada; no mobile os filtros ficam em drawer para preservar o frame. As artes estão em `public/figma-assets` e não dependem de URLs externas.

Estados sem frame próprio — carregamento, vazio, erro, perfil e carteiras no mobile — seguem os mesmos tokens visuais. Skeletons respeitam `prefers-reduced-motion`; diálogos usam Radix para foco e teclado.

## Decisões e limitações

- Blockchain, carteiras reais, login social e explorador de transações permanecem simulados, conforme o escopo.
- As miniaturas da galeria repetem a única imagem disponível de cada NFT no Figma.
- O catálogo possui variações adicionais dos quatro assets originais para permitir paginação e filtros sem inventar novas imagens.
- O formulário de novidades persiste o e-mail somente no navegador e informa exatamente esse comportamento.
- A única alteração deliberada na home desktop é o controle de coleção pedido; as demais seções seguem a composição e os textos do Figma.
