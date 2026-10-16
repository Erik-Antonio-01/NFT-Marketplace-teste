import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { endpoints, message } from '../api'
import { notify, useCart, useCartActions, useSession } from '../hooks'
import { EmptyState, ErrorState, Price, Summary } from '../components/common'
import { Button } from '../components/ui/button'
import { key } from '../mock/store'
import { requestAuth } from '../auth-events'
import { NftRecommendations } from '../components/sections'

export function Cart() {
  const { data: session } = useSession()
  const user = session?.user
  const navigate = useNavigate()
  const cart = useCart(user)
  const actions = useCartActions()
  const [code, setCode] = useState(sessionStorage.getItem('kurio.coupon') ?? '')
  const [coupon, setCoupon] = useState(sessionStorage.getItem('kurio.coupon') ?? '')
  const quote = useQuery({ queryKey: ['quote', user?.id ?? 'guest', cart.data?.items, coupon, 'Ethereum'], queryFn: () => endpoints.quote(coupon, 'Ethereum'), enabled: Boolean(cart.data) })

  const updateQty = async (id: string, value: number) => {
    try { await actions.quantity.mutateAsync({ id, value }) } catch (error) { notify(message(error), 'error') }
  }
  const remove = async (id: string) => {
    try { await actions.remove.mutateAsync(id); notify('NFT removido do carrinho.', 'success') } catch (error) { notify(message(error), 'error') }
  }
  const applyCoupon = async () => {
    if (!code.trim()) { setCoupon(''); sessionStorage.removeItem('kurio.coupon'); return }
    try {
      await endpoints.coupon(code)
      const normalized = code.trim().toUpperCase()
      setCoupon(normalized)
      sessionStorage.setItem('kurio.coupon', normalized)
      notify('Código promocional aplicado.', 'success')
    } catch (error) { notify(message(error), 'error') }
  }

  return <div className="container inner-page cart-page">
    <div className="breadcrumbs desktop-only"><Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Início</Link><span>/</span><span>Mercado</span><span>/</span><span>Carrinho</span></div>
    <div className="mobile-cart-title mobile-only"><Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}><ChevronLeft/></Link><h1>Carrinho de NFTs</h1></div>
    {cart.isLoading ? <div className="cart-layout"><div className="skeleton cart-skeleton"/><Summary loading/></div> : cart.isError ? <ErrorState error={cart.error} retry={() => void cart.refetch()}/> : !cart.data?.items.length ? <EmptyState title="Seu carrinho está vazio" detail="Explore as coleções e escolha seus NFTs."/> : <div className="cart-layout">
      <section className="cart-items">
        <div className="cart-table-head desktop-only"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span/></div>
        {quote.isError && <ErrorState error={quote.error} retry={() => void quote.refetch()}/>}
        {quote.data?.lines.map((line) => <article className="cart-line" key={key(line)}>
          <Link to="/nft/$id" params={{ id: line.nftId }}><img src={line.nft.image} alt={line.nft.title}/></Link>
          <div className="cart-line-name"><Link to="/nft/$id" params={{ id: line.nftId }}>{line.nft.title}</Link><small className="desktop-only">ID do token: #{line.nft.title.match(/#(\d+)/)?.[1] ?? '0000'}</small><small className="mobile-only">Edição: {line.edition.label}</small><span className="mobile-only"><Price value={line.lineTotal}/></span></div>
          <span className="desktop-only"><Price value={line.edition.priceEth}/></span>
          <div className="quantity-stepper"><button aria-label={`Diminuir ${line.nft.title}`} disabled={line.quantity <= 1} onClick={() => void updateQty(key(line), line.quantity - 1)}><Minus/></button><span>{line.quantity}</span><button aria-label={`Aumentar ${line.nft.title}`} disabled={line.quantity >= line.edition.available} onClick={() => void updateQty(key(line), line.quantity + 1)}><Plus/></button></div>
          <span className="desktop-only"><Price value={line.lineTotal}/></span>
          <button className="remove-line" aria-label={`Remover ${line.nft.title}`} onClick={() => void remove(key(line))}><Trash2/></button>
        </article>)}
      </section>
      <aside className="cart-summary">
        <div className="coupon-area"><label htmlFor="coupon">Código promocional</label><div><input id="coupon" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Digite o código promocional..."/><button onClick={() => void applyCoupon()}>Aplicar</button></div></div>
        <Summary quote={quote.data} loading={quote.isLoading || Boolean(quote.isFetching && !quote.data)}/>
        <Button className="checkout-button" disabled={!quote.data?.valid || quote.isFetching} onClick={() => user ? void navigate({ to: '/checkout' }) : requestAuth('login', '/checkout')}>Conectar e finalizar</Button>
        <Link className="continue-link" to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Continuar explorando</Link>
      </aside>
    </div>}
    <NftRecommendations title="Colecionadores também viram" limit={4}/>
  </div>
}
