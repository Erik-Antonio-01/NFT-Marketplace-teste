import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, LogIn, Menu, Search, ShoppingCart, SlidersHorizontal, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { endpoints, message, TOKEN_KEY } from '../api'
import { cartCount, notify, useCart, useFavoriteAction, useFavorites, useRealtime, useSession, useSessionExpiry } from '../hooks'
import type { CatalogSearch, Nft, Quote, User } from '../types'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'
import { AuthDialog } from '../pages/auth'
import { consumeAuthRequest, requestAuth, type AuthRequest } from '../auth-events'
import { SiteFooter } from './footer'

export const homeSearch = { q: '', category: 'All', sort: 'featured', page: 1, max: '' } satisfies CatalogSearch

export function Price({ value }: { value: string }) {
  const amount = Number(value)
  return <span className="price">{amount < 0.1 ? amount.toFixed(3) : amount.toFixed(2)} ETH</span>
}

export function LoadingGrid({ count = 8 }: { count?: number }) {
  return <div className="nft-grid">{Array.from({ length: count }, (_, i) => <div key={i} className="nft-card skeleton-card"><div className="skeleton nft-art" /><div className="skeleton skeleton-title" /><div className="skeleton skeleton-price" /></div>)}</div>
}

export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  return <div role="alert" className="empty-state"><h3>Algo deu errado</h3><p>{message(error)}</p><Button onClick={retry}>Tentar novamente</Button></div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><h3>{title}</h3><p>{detail}</p><Button asChild><Link to="/" search={homeSearch}>Explorar NFTs</Link></Button></div>
}

export function NftCard({ nft, user }: { nft: Nft; user?: User | null }) {
  const favorites = useFavorites(user)
  const favorite = useFavoriteAction(user)
  const saved = Boolean(favorites.data?.ids.includes(nft.id))
  return <article className="nft-card">
    <Link to="/nft/$id" params={{ id: nft.id }} className="nft-art-link">
      <img src={nft.image} alt={nft.title} loading="lazy" width="512" height="512" className="nft-art" />
      {nft.category === 'Collectibles' && <span className="rarity-badge">RARO</span>}
    </Link>
    <button type="button" className={`heart-button ${saved ? 'saved' : ''}`} aria-label={saved ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`} onClick={() => user ? favorite.mutate({ id: nft.id, active: !saved }) : requestAuth('login', `/nft/${nft.id}`)}>
      <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
    </button>
    <Link className="card-title" to="/nft/$id" params={{ id: nft.id }}>{nft.title}</Link>
    <Price value={nft.editions.find((edition) => edition.id === 'standard')?.priceEth ?? nft.editions[0].priceEth} />
  </article>
}

export function Summary({ quote, loading = false }: { quote?: Quote; loading?: boolean }) {
  return <div className="summary-card"><h3>Resumo da carteira</h3>{loading || !quote ? <div className="summary-loading"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : <div className="summary-content">
    <div className="summary-row"><span>Subtotal</span><Price value={quote.subtotal}/></div>
    <div className="summary-row"><span>Desconto do lançamento</span><span>(-) {Number(quote.discount).toFixed(2)} ETH</span></div>
    <div className="summary-row"><span>Taxa de rede</span><Price value={quote.networkFee}/></div>
    <small>Taxa estimada</small>
    <div className="summary-row total"><strong>Total</strong><Price value={quote.total}/></div>
    {quote.issues.map((issue) => <p role="alert" className="error-text" key={issue}>{issue}</p>)}
  </div>}</div>
}

export function AppShell() {
  const session = useSession()
  const user = session.data?.user
  const cart = useCart(user)
  const client = useQueryClient()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState<{ text: string; type: string } | null>(null)
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useRealtime(user)
  useSessionExpiry()

  useEffect(() => {
    const onNotice = (event: Event) => setNotice((event as CustomEvent).detail)
    window.addEventListener('kurio:notice', onNotice)
    return () => window.removeEventListener('kurio:notice', onNotice)
  }, [])
  useEffect(() => {
    const onAuth = (event: Event) => setAuthRequest((event as CustomEvent<AuthRequest>).detail)
    window.addEventListener('kurio:auth', onAuth)
    return () => window.removeEventListener('kurio:auth', onAuth)
  }, [])
  useEffect(() => {
    const pending = consumeAuthRequest()
    if (pending) setAuthRequest(pending)
  }, [pathname])
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(id)
  }, [notice])

  const logout = async () => {
    try { await endpoints.logout() } finally {
      localStorage.removeItem(TOKEN_KEY)
      client.clear()
      setMenu(false)
      notify('Sessão encerrada.', 'success')
      void navigate({ to: '/', search: homeSearch })
    }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Ir para o conteúdo</a>
    <header className="site-header"><div className="container header-inner">
      <Link to="/" search={homeSearch} className="brand" aria-label="Kurio — início">KURIO</Link>
      <nav aria-label="Navegação principal" className="desktop-nav">
        <Link to="/" search={homeSearch} activeOptions={{ exact: true }}>Início</Link>
        <a href="#catalogo">Mercado</a>
        <a href="#criadores">Criadores</a>
        <a href="#aprenda">Aprenda</a>
      </nav>
      <div className="header-actions">
        <Link to="/" search={homeSearch} className="icon-button" aria-label="Buscar"><Search size={24}/></Link>
        <Link to="/cart" className="cart-button" aria-label={`Carrinho, ${cartCount(cart.data?.items)} itens`}><ShoppingCart size={25}/>{cartCount(cart.data?.items) > 0 && <span className="cart-count">{cartCount(cart.data?.items)}</span>}</Link>
        {user ? <Link to="/profile" className="enter-button">Perfil</Link> : <button className="enter-button" onClick={() => requestAuth('login')}><LogIn size={20}/> Entrar</button>}
        <button className="icon-button mobile-menu-button" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu size={24}/></button>
      </div>
    </div></header>
    <main id="main"><Outlet /></main>
    <SiteFooter/>
    {notice && <div className={`toast toast-${notice.type}`} role="status" aria-live="polite"><span>{notice.text}</span><button aria-label="Fechar aviso" onClick={() => setNotice(null)}><X size={16}/></button></div>}
    <Modal open={menu} onOpenChange={setMenu} title="Menu">
      <nav className="mobile-nav">
        <Link to="/" search={homeSearch} onClick={() => setMenu(false)}>Início</Link>
        <Link to="/cart" onClick={() => setMenu(false)}>Carrinho</Link>
        {user ? <><Link to="/profile" onClick={() => setMenu(false)}>Meu perfil</Link><Link to="/wallets" onClick={() => setMenu(false)}>Carteiras</Link><button onClick={() => void logout()}>Sair</button></> : <button onClick={() => { setMenu(false); requestAuth('login') }}>Entrar</button>}
      </nav>
    </Modal>
    <AuthDialog open={Boolean(authRequest)} initialMode={authRequest?.mode ?? 'login'} redirect={authRequest?.redirect} onOpenChange={(open) => { if (!open) setAuthRequest(null) }}/>
  </div>
}

export function MobileSearch({ value, onChange, onFilter }: { value: string; onChange: (value: string) => void; onFilter: () => void }) {
  return <div className="mobile-search"><label><Search size={19}/><input aria-label="Explorar coleções" placeholder="Explorar coleções" value={value} onChange={(event) => onChange(event.target.value)}/></label><button aria-label="Abrir filtros" onClick={onFilter}><SlidersHorizontal size={20}/></button></div>
}
