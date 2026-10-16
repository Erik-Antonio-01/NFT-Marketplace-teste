import Decimal from 'decimal.js'
import type { Account, AppStore, CartItem, Nft, NftEvent, OrderEvent, Quote, User } from '../types'
import { seed } from './fixtures'

const STORE_KEY = 'kurio.mock.v1'
export function load(): AppStore {
  try { const value = localStorage.getItem(STORE_KEY); return value ? JSON.parse(value) as AppStore : reset() }
  catch { return reset() }
}
export function save(state: AppStore) { localStorage.setItem(STORE_KEY, JSON.stringify(state)) }
export function reset() { const state = seed(); save(state); return state }
export function publicUser(account: Account): User {
  const { id, name, email, avatar, joinedAt } = account
  return { id, name, email, avatar, joinedAt }
}
export function sessionAccount(state: AppStore, token?: string | null): Account | null {
  if (!state.session || !token || state.session.token !== token || Date.now() >= state.session.expiresAt) return null
  return state.accounts.find((user) => user.id === state.session?.userId) ?? null
}
export function cartFor(state: AppStore, user: Account | null) { return user ? user.cart : state.guestCart }
export function nftFor(state: AppStore, id: string): Nft | undefined { return state.nfts.find((nft) => nft.id === id) }
export function key(item: CartItem) { return `${item.nftId}:${item.editionId}` }
export function mergeCart(to: CartItem[], from: CartItem[], state: AppStore) {
  for (const item of from) {
    const stock = nftFor(state, item.nftId)?.editions.find((e) => e.id === item.editionId)?.available ?? 0
    const existing = to.find((i) => key(i) === key(item))
    if (existing) existing.quantity = Math.min(stock, existing.quantity + item.quantity)
    else if (stock > 0) to.push({ ...item, quantity: Math.min(stock, item.quantity) })
  }
}
const eth = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(6).toFixed(6)
export function quoteFor(state: AppStore, cart: CartItem[], coupon: string, network: string): Quote {
  const lines = cart.flatMap((item) => {
    const nft = nftFor(state, item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    return nft && edition ? [{ ...item, nft, edition, lineTotal: eth(new Decimal(edition.priceEth).times(item.quantity)) }] : []
  })
  const issues = lines.filter((line) => line.quantity > line.edition.available || line.quantity < 1)
    .map((line) => `${line.nft.title}: apenas ${line.edition.available} disponíveis.`)
  if (!cart.length) issues.push('Seu carrinho está vazio.')
  if (lines.length !== cart.length) issues.push('Um item não está mais disponível.')
  if (coupon && !['KURIO10'].includes(coupon.toUpperCase())) issues.push(coupon.toUpperCase() === 'EXPIRED' ? 'Este cupom expirou.' : 'Código promocional inválido.')
  const subtotal = lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0))
  const discount = coupon.toUpperCase() === 'KURIO10' ? subtotal.times('0.10') : new Decimal(0)
  const networkFee = new Decimal(network === 'Polygon' ? '0.000500' : '0.004000')
  const fingerprint = JSON.stringify({ items: lines.map((line) => [key(line), line.quantity, line.edition.priceEth, line.edition.available, line.nft.version]), coupon: coupon.toUpperCase(), network })
  return { lines, subtotal: eth(subtotal), discount: eth(discount), networkFee: eth(networkFee), total: eth(subtotal.minus(discount).plus(networkFee)), coupon, network, fingerprint, usdRate: '3250.00', valid: !issues.length, issues }
}
export type RealTimeEvent = { type: 'nft.updated'; payload: NftEvent } | { type: 'order.updated'; payload: OrderEvent }
const listeners = new Set<(event: RealTimeEvent) => void>()
export function subscribe(fn: (event: RealTimeEvent) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function publish(event: RealTimeEvent) { for (const listener of listeners) listener(event) }
export function changeNft(state: AppStore, id: string, changes: { priceEth?: string; available?: number }) {
  const nft = nftFor(state, id)
  if (!nft) return null
  const edition = nft.editions.find((item) => item.id === 'standard') ?? nft.editions[0]
  if (changes.priceEth !== undefined) edition.priceEth = eth(changes.priceEth)
  if (changes.available !== undefined) edition.available = Math.max(0, Math.trunc(changes.available))
  nft.version++
  state.eventSequence++
  save(state)
  publish({ type: 'nft.updated', payload: { id: `evt-${state.eventSequence}`, resourceId: nft.id, version: nft.version, nft } })
  return nft
}
export function publishOrder(state: AppStore, orderId: string) {
  const order = state.orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return
  order.status = state.scenario === 'payment-declined' ? 'declined' : 'confirmed'
  order.version++
  if (order.status === 'confirmed') {
    order.txHash = `0x${order.id.replaceAll('-', '').padEnd(64, '0').slice(0, 64)}`
    const user = state.accounts.find((u) => u.id === order.userId)
    if (user) for (const line of order.quote.lines) {
      const existing = user.cart.find((item) => key(item) === key(line))
      if (existing) existing.quantity -= line.quantity
      user.cart = user.cart.filter((item) => item.quantity > 0)
    }
  }
  state.eventSequence++
  save(state)
  publish({ type: 'order.updated', payload: { id: `evt-${state.eventSequence}`, resourceId: order.id, version: order.version, userId: order.userId, order } })
}
export async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`collex-demo-static-salt:${password}`)
  const hashed = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashed)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
