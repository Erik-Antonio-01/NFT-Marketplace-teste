import axios from 'axios'
import type { CartItem, CartLine, Catalog, CatalogSearch, Nft, Order, Quote, User, Wallet } from './types'

export const TOKEN_KEY = 'kurio.session.token'
export const api = axios.create({ baseURL: '/api', timeout: 12000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    const authorization = error.config?.headers?.get?.('Authorization') ?? error.config?.headers?.Authorization
    const failedToken = typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : null
    const currentToken = localStorage.getItem(TOKEN_KEY)
    if (failedToken && failedToken === currentToken) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('kurio:session-expired'))
    }
  }
  return Promise.reject(error)
})
export function message(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Conexão indisponível. Verifique sua rede e tente novamente.' : error.message)
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.'
}
export const endpoints = {
  session: async () => (await api.get<{ user: User | null }>('/auth/session')).data,
  login: async (data: { email: string; password: string }) => (await api.post<{ user: User; token: string }>('/auth/login', data)).data,
  register: async (data: { name: string; email: string; password: string }) => (await api.post<{ user: User; token: string }>('/auth/register', data)).data,
  logout: async () => (await api.post('/auth/logout')).data,
  catalog: async (params: CatalogSearch, signal?: AbortSignal) => (await api.get<Catalog>('/nfts', { params, signal })).data,
  nft: async (id: string, signal?: AbortSignal) => (await api.get<Nft>(`/nfts/${id}`, { signal })).data,
  favorites: async () => (await api.get<{ ids: string[] }>('/favorites')).data,
  favorite: async (id: string, active: boolean) => (await api({ method: active ? 'POST' : 'DELETE', url: `/favorites/${id}` })).data as { ids: string[] },
  cart: async () => (await api.get<{ items: CartItem[] }>('/cart')).data,
  add: async (item: CartItem) => (await api.post<{ items: CartItem[] }>('/cart', item)).data,
  quantity: async (id: string, quantity: number) => (await api.patch<{ items: CartItem[] }>(`/cart/${encodeURIComponent(id)}`, { quantity })).data,
  remove: async (id: string) => (await api.delete<{ items: CartItem[] }>(`/cart/${encodeURIComponent(id)}`)).data,
  quote: async (coupon: string, network: string) => (await api.post<Quote>('/quote', { coupon, network })).data,
  coupon: async (code: string) => (await api.post('/coupons/validate', { code })).data,
  order: async (data: { idempotencyKey: string; fingerprint: string; coupon: string; network: string; walletId: string; collector: string }) => (await api.post<Order>('/orders', data)).data,
  orderById: async (id: string) => (await api.get<Order>(`/orders/${id}`)).data,
  orders: async () => (await api.get<{ items: Order[] }>('/orders')).data,
  profile: async () => (await api.get<User>('/profile')).data,
  updateProfile: async (data: Pick<User, 'name' | 'email' | 'avatar'>) => (await api.patch<User>('/profile', data)).data,
  password: async (current: string, next: string) => (await api.patch('/profile/password', { current, next })).data,
  wallets: async () => (await api.get<{ items: Wallet[] }>('/wallets')).data,
  createWallet: async (wallet: Omit<Wallet, 'id'>) => (await api.post<{ items: Wallet[] }>('/wallets', wallet)).data,
  editWallet: async (id: string, wallet: Omit<Wallet, 'id'>) => (await api.patch<{ items: Wallet[] }>(`/wallets/${id}`, wallet)).data,
  reset: async () => (await api.post('/demo/reset')).data,
  scenario: async (scenario: string) => (await api.post('/demo/scenario', { scenario })).data,
  changeNft: async (nftId: string, priceEth?: string, available?: number) => (await api.post('/demo/nft-change', { nftId, priceEth, available })).data,
}
export type { CartLine }
