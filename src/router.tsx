import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { queryClient } from './query'
import { endpoints } from './api'
import { AppShell, homeSearch } from './components/common'
import { Home } from './pages/home'
import { Detail } from './pages/detail'
import { Cart } from './pages/cart'
import { Checkout } from './pages/checkout'
import { rememberAuthRequest } from './auth-events'
import { Profile } from './pages/profile'
import { Wallets } from './pages/wallets'
import { Favorites } from './pages/favorites'
import { Orders, OrderDetail } from './pages/orders'
import { EmptyState } from './components/common'

const root = createRootRoute({ component: AppShell, notFoundComponent: () => <div className="container inner-page"><EmptyState title="Página não encontrada" detail="Este endereço não faz parte do marketplace." /></div> })
const privateRoute = async ({ location }: { location: { href: string } }) => {
  const session = await queryClient.fetchQuery({ queryKey: ['session'], queryFn: endpoints.session, staleTime: 0 })
  if (!session.user) {
    rememberAuthRequest({ mode: 'login', redirect: location.href })
    throw redirect({ to: '/', search: homeSearch })
  }
}
const home = createRoute({ getParentRoute: () => root, path: '/', validateSearch: z.object({
  q: z.string().catch(''), category: z.enum(['All', 'Art', 'Collectibles', 'Gaming', 'Photography']).catch('All'),
  sort: z.enum(['featured', 'price-asc', 'price-desc', 'name']).catch('featured'),
  page: z.coerce.number().int().positive().catch(1), max: z.string().catch(''),
}).parse, component: Home })
const nft = createRoute({ getParentRoute: () => root, path: '/nft/$id', component: Detail })
const cart = createRoute({ getParentRoute: () => root, path: '/cart', component: Cart })
const checkout = createRoute({ getParentRoute: () => root, path: '/checkout', beforeLoad: privateRoute, component: Checkout })
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  validateSearch: z.object({ redirect: z.string().optional() }).parse,
  beforeLoad: ({ search }) => {
    rememberAuthRequest({ mode: 'login', redirect: search.redirect })
    throw redirect({ to: '/', search: homeSearch })
  },
  component: () => null,
})
const register = createRoute({
  getParentRoute: () => root,
  path: '/register',
  validateSearch: z.object({ redirect: z.string().optional() }).parse,
  beforeLoad: ({ search }) => {
    rememberAuthRequest({ mode: 'register', redirect: search.redirect })
    throw redirect({ to: '/', search: homeSearch })
  },
  component: () => null,
})
const profile = createRoute({ getParentRoute: () => root, path: '/profile', beforeLoad: privateRoute, component: Profile })
const wallets = createRoute({ getParentRoute: () => root, path: '/wallets', beforeLoad: privateRoute, component: Wallets })
const favorites = createRoute({ getParentRoute: () => root, path: '/favorites', beforeLoad: privateRoute, component: Favorites })
const orders = createRoute({ getParentRoute: () => root, path: '/orders', beforeLoad: privateRoute, component: Orders })
const order = createRoute({ getParentRoute: () => root, path: '/orders/$id', beforeLoad: privateRoute, component: OrderDetail })

const routeTree = root.addChildren([home, nft, cart, checkout, login, register, profile, wallets, favorites, orders, order])
export const router = createRouter({ routeTree, defaultPreload: 'intent', defaultPreloadStaleTime: 20_000, defaultNotFoundComponent: () => <div className="container inner-page"><EmptyState title="Página não encontrada" detail="Explore os NFTs disponíveis." /></div> })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
export { homeSearch }
