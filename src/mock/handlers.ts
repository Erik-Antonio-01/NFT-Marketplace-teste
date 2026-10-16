import { http, HttpResponse, delay } from 'msw'
import type { JsonBodyType } from 'msw'
import type { Account, CartItem, Order, Wallet } from '../types'
import { load, save, reset, publicUser, sessionAccount, cartFor, nftFor, key, mergeCart, quoteFor, changeNft, publishOrder, hashPassword } from './store'

const ok = <T,>(body: T, status = 200) => HttpResponse.json(body as JsonBodyType, { status })
const failure = (code: string, message: string, status = 400) => HttpResponse.json({ code, message }, { status })
const token = (request: Request) => request.headers.get('authorization')?.replace(/^Bearer /, '') ?? null
function account(request: Request): Account | null { return sessionAccount(load(), token(request)) }
const unauthorized = () => failure('UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.', 401)
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const addressValid = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)

async function simulateNetwork(path = '') {
  const scenario = load().scenario
  if (scenario === 'slow') await delay(1600)
  else if (scenario === 'out-of-order') await delay(path.includes('page=1') ? 1000 : 100)
  else await delay(100)
  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'server-error') return failure('SERVER_ERROR', 'Interrupção temporária do serviço. Tente novamente.', 503)
  return null
}

export const restHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    const problem = await simulateNetwork(request.url); if (problem) return problem
    const state = load(); const params = new URL(request.url).searchParams
    const q = (params.get('q') ?? '').trim().toLowerCase(); const category = params.get('category') ?? 'All'
    const max = Number(params.get('max') || 0); const page = Math.max(1, Number(params.get('page') || 1) || 1)
    const sort = params.get('sort') ?? 'featured'
    const items = state.nfts.filter((nft) => (!q || `${nft.title} ${nft.artist}`.toLowerCase().includes(q)) &&
      (category === 'All' || nft.category === category) && (!max || Number(nft.editions[0].priceEth) <= max))
    items.sort((a, b) => sort === 'price-asc' ? Number(a.editions[0].priceEth) - Number(b.editions[0].priceEth) :
      sort === 'price-desc' ? Number(b.editions[0].priceEth) - Number(a.editions[0].priceEth) :
      sort === 'name' ? a.title.localeCompare(b.title) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    const perPage = 8
    return ok({ items: items.slice((page - 1) * perPage, page * perPage), page, total: items.length, pages: Math.max(1, Math.ceil(items.length / perPage)) })
  }),
  http.get('/api/nfts/:id', async ({ params }) => {
    const problem = await simulateNetwork(); if (problem) return problem
    const nft = nftFor(load(), String(params.id))
    return nft ? ok(nft) : failure('NOT_FOUND', 'Este NFT não foi encontrado.', 404)
  }),
  http.get('/api/auth/session', async ({ request }) => {
    await delay(45); const user = account(request)
    return ok({ user: user ? publicUser(user) : null })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const state = load()
    const user = state.accounts.find((candidate) => candidate.email.toLowerCase() === body.email?.trim().toLowerCase())
    if (!user || user.passwordHash !== await hashPassword(body.password ?? '')) return failure('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', 401)
    mergeCart(user.cart, state.guestCart, state); state.guestCart = []
    state.session = { token: crypto.randomUUID(), userId: user.id, expiresAt: Date.now() + 45 * 60 * 1000 }
    save(state); return ok({ user: publicUser(user), token: state.session.token })
  }),
  http.post('/api/auth/register', async ({ request }) => {
    const { name, email, password } = await request.json() as { name: string; email: string; password: string }
    if ((name ?? '').trim().length < 2 || !isEmail(email ?? '') || (password ?? '').length < 8) return failure('VALIDATION', 'Informe nome, e-mail válido e senha de pelo menos 8 caracteres.', 422)
    const state = load()
    if (state.accounts.some((u) => u.email.toLowerCase() === email.toLowerCase())) return failure('EMAIL_CONFLICT', 'Este e-mail já está cadastrado.', 409)
    const user: Account = { id: crypto.randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await hashPassword(password), joinedAt: new Date().toISOString(), avatar: '/figma-assets/violet-nomad-314.webp', wallets: [], favorites: [], cart: [] }
    mergeCart(user.cart, state.guestCart, state); state.guestCart = []
    state.accounts.push(user); state.session = { token: crypto.randomUUID(), userId: user.id, expiresAt: Date.now() + 45 * 60 * 1000 }
    save(state); return ok({ user: publicUser(user), token: state.session.token }, 201)
  }),
  http.post('/api/auth/logout', () => { const state = load(); state.session = null; save(state); return ok({ success: true }) }),
  http.get('/api/favorites', ({ request }) => { const user = account(request); return user ? ok({ ids: user.favorites }) : unauthorized() }),
  http.post('/api/favorites/:id', ({ request, params }) => {
    const state = load(); const user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    if (state.scenario === 'favorite-fail') return failure('SERVER_ERROR', 'Não foi possível salvar o favorito. Tente novamente.', 503)
    if (!nftFor(state, String(params.id))) return failure('NOT_FOUND', 'NFT indisponível.', 404)
    if (!user.favorites.includes(String(params.id))) user.favorites.push(String(params.id))
    save(state); return ok({ ids: user.favorites })
  }),
  http.delete('/api/favorites/:id', ({ request, params }) => {
    const state = load(); const user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    if (state.scenario === 'favorite-fail') return failure('SERVER_ERROR', 'Não foi possível atualizar seus favoritos.', 503)
    user.favorites = user.favorites.filter((id) => id !== params.id); save(state); return ok({ ids: user.favorites })
  }),
  http.get('/api/cart', ({ request }) => {
    const state = load(); return ok({ items: cartFor(state, sessionAccount(state, token(request))) })
  }),
  http.post('/api/cart', async ({ request }) => {
    const { nftId, editionId, quantity } = await request.json() as CartItem
    const state = load(), cart = cartFor(state, sessionAccount(state, token(request)))
    const edition = nftFor(state, nftId)?.editions.find((e) => e.id === editionId)
    if (!edition) return failure('NOT_FOUND', 'Edição não encontrada.', 404)
    const existing = cart.find((i) => i.nftId === nftId && i.editionId === editionId)
    const next = (existing?.quantity ?? 0) + quantity
    if (!Number.isInteger(quantity) || quantity < 1 || next > edition.available) return failure('OUT_OF_STOCK', `Apenas ${edition.available} disponíveis.`, 409)
    if (existing) existing.quantity = next; else cart.push({ nftId, editionId, quantity })
    save(state); return ok({ items: cart }, 201)
  }),
  http.patch('/api/cart/:itemKey', async ({ request, params }) => {
    const { quantity } = await request.json() as { quantity: number }
    const state = load(), cart = cartFor(state, sessionAccount(state, token(request)))
    const item = cart.find((i) => key(i) === params.itemKey)
    if (!item) return failure('NOT_FOUND', 'Item do carrinho não encontrado.', 404)
    const stock = nftFor(state, item.nftId)?.editions.find((e) => e.id === item.editionId)?.available ?? 0
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) return failure('OUT_OF_STOCK', `Apenas ${stock} disponíveis.`, 409)
    item.quantity = quantity; save(state); return ok({ items: cart })
  }),
  http.delete('/api/cart/:itemKey', ({ request, params }) => {
    const state = load(), cart = cartFor(state, sessionAccount(state, token(request)))
    const index = cart.findIndex((i) => key(i) === params.itemKey)
    if (index < 0) return failure('NOT_FOUND', 'Item do carrinho não encontrado.', 404)
    cart.splice(index, 1); save(state); return ok({ items: cart })
  }),
  http.post('/api/quote', async ({ request }) => {
    const { coupon = '', network = 'Ethereum' } = await request.json() as { coupon?: string; network?: string }
    const problem = await simulateNetwork(); if (problem) return problem
    const state = load(); return ok(quoteFor(state, cartFor(state, sessionAccount(state, token(request))), coupon, network))
  }),
  http.post('/api/coupons/validate', async ({ request }) => {
    const { code } = await request.json() as { code: string }
    if (code?.toUpperCase() === 'KURIO10') return ok({ code: 'KURIO10', percent: 10 })
    return failure('INVALID_COUPON', code?.toUpperCase() === 'EXPIRED' ? 'Este cupom expirou.' : 'Código promocional inválido.', 422)
  }),
  http.post('/api/orders', async ({ request }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const body = await request.json() as { idempotencyKey: string; fingerprint: string; coupon: string; network: string; walletId: string; collector: string }
    if (!body.idempotencyKey) return failure('VALIDATION', 'A chave de idempotência é obrigatória.', 422)
    const requestHash = JSON.stringify({ fingerprint: body.fingerprint, coupon: body.coupon, network: body.network, walletId: body.walletId, collector: body.collector })
    const prior = state.orders.find((order) => order.userId === user.id && order.idempotencyKey === body.idempotencyKey)
    if (prior) return prior.requestHash === requestHash ? ok(prior) : failure('KEY_CONFLICT', 'Esta chave já foi usada em outra compra.', 409)
    const wallet = user.wallets.find((w) => w.id === body.walletId)
    if (!wallet) return failure('WALLET_REQUIRED', 'Selecione uma carteira cadastrada.', 422)
    if (!body.collector?.trim()) return failure('VALIDATION', 'O nome do colecionador é obrigatório.', 422)
    const quote = quoteFor(state, user.cart, body.coupon ?? '', body.network)
    if (!quote.valid) return failure('QUOTE_INVALID', quote.issues.join(' '), 409)
    if (quote.fingerprint !== body.fingerprint) return HttpResponse.json({ code: 'QUOTE_CHANGED', message: 'The price or availability changed. Review the new total.', quote }, { status: 409 })
    const order: Order = { id: crypto.randomUUID(), userId: user.id, status: 'pending', version: 1, idempotencyKey: body.idempotencyKey, requestHash, quote: structuredClone(quote), wallet: structuredClone(wallet), collector: body.collector, createdAt: new Date().toISOString() }
    state.orders.push(order); save(state)
    setTimeout(() => publishOrder(load(), order.id), 1650)
    if (state.scenario === 'timeout-order') return failure('GATEWAY_TIMEOUT', 'O pedido pode ter sido criado. Verifique seu status antes de tentar novamente.', 504)
    return ok(order, 202)
  }),
  http.get('/api/orders/:id', ({ request, params }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const order = state.orders.find((o) => o.id === params.id && o.userId === user.id)
    if (!order) return failure('NOT_FOUND', 'Pedido não encontrado.', 404)
    if (order.status === 'pending' && Date.now() - new Date(order.createdAt).getTime() > 1800) {
      publishOrder(state, order.id); return ok(load().orders.find((o) => o.id === order.id))
    }
    return ok(order)
  }),
  http.get('/api/orders', ({ request }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    return ok({ items: state.orders.filter((o) => o.userId === user.id) })
  }),
  http.get('/api/profile', ({ request }) => { const user = account(request); return user ? ok(publicUser(user)) : unauthorized() }),
  http.patch('/api/profile', async ({ request }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const { name, email, avatar } = await request.json() as { name: string; email: string; avatar: string }
    if ((name ?? '').trim().length < 2 || !isEmail(email ?? '')) return failure('VALIDATION', 'Informe um nome e um e-mail válido.', 422)
    if (state.accounts.some((u) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase())) return failure('EMAIL_CONFLICT', 'Este e-mail pertence a outra conta.', 409)
    user.name = name.trim(); user.email = email.trim().toLowerCase(); user.avatar = avatar || user.avatar
    save(state); return ok(publicUser(user))
  }),
  http.patch('/api/profile/password', async ({ request }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const { current, next } = await request.json() as { current: string; next: string }
    if (await hashPassword(current ?? '') !== user.passwordHash) return failure('INVALID_PASSWORD', 'A senha atual está incorreta.', 422)
    if ((next ?? '').length < 8) return failure('VALIDATION', 'A nova senha deve ter pelo menos 8 caracteres.', 422)
    user.passwordHash = await hashPassword(next); save(state); return ok({ success: true })
  }),
  http.get('/api/wallets', ({ request }) => { const user = account(request); return user ? ok({ items: user.wallets }) : unauthorized() }),
  http.post('/api/wallets', async ({ request }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const body = await request.json() as Omit<Wallet, 'id'>
    if (!body.label?.trim() || !addressValid(body.address ?? '') || !['Ethereum', 'Polygon'].includes(body.network)) return failure('VALIDATION', 'Informe um apelido, endereço 0x válido e rede.', 422)
    if (user.wallets.some((w) => w.address.toLowerCase() === body.address.toLowerCase())) return failure('WALLET_CONFLICT', 'Esta carteira já está cadastrada.', 409)
    if (body.primary) user.wallets.forEach((wallet) => { wallet.primary = false })
    user.wallets.push({ id: crypto.randomUUID(), label: body.label.trim(), address: body.address, network: body.network, primary: body.primary || !user.wallets.length })
    save(state); return ok({ items: user.wallets }, 201)
  }),
  http.patch('/api/wallets/:id', async ({ request, params }) => {
    const state = load(), user = sessionAccount(state, token(request)); if (!user) return unauthorized()
    const wallet = user.wallets.find((w) => w.id === params.id); if (!wallet) return failure('NOT_FOUND', 'Carteira não encontrada.', 404)
    const body = await request.json() as Omit<Wallet, 'id'>
    if (!body.label?.trim() || !addressValid(body.address ?? '') || !['Ethereum', 'Polygon'].includes(body.network)) return failure('VALIDATION', 'Informe um nome e endereço de carteira válidos.', 422)
    if (user.wallets.some((w) => w.id !== wallet.id && w.address.toLowerCase() === body.address.toLowerCase())) return failure('WALLET_CONFLICT', 'Esta carteira já existe.', 409)
    if (body.primary) user.wallets.forEach((w) => { w.primary = false })
    Object.assign(wallet, { label: body.label.trim(), address: body.address, network: body.network, primary: body.primary })
    if (!user.wallets.some((w) => w.primary)) wallet.primary = true
    save(state); return ok({ items: user.wallets })
  }),
  http.post('/api/demo/reset', () => ok({ scenario: reset().scenario })),
  http.post('/api/demo/scenario', async ({ request }) => {
    const { scenario } = await request.json() as { scenario: string }
    const state = load(); state.scenario = scenario; save(state)
    if (scenario === 'session-expired' && state.session) { state.session.expiresAt = Date.now() - 1000; save(state) }
    return ok({ scenario })
  }),
  http.post('/api/demo/nft-change', async ({ request }) => {
    const { nftId = 'nft-1', priceEth, available } = await request.json() as { nftId?: string; priceEth?: string; available?: number }
    const updated = changeNft(load(), nftId, { priceEth, available })
    return updated ? ok(updated) : failure('NOT_FOUND', 'NFT não encontrado.', 404)
  }),
]

export const handlers = restHandlers
