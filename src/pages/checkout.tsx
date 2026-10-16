import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { endpoints, message } from '../api'
import { notify, useCart, useSession } from '../hooks'
import { EmptyState, ErrorState, Price, Summary } from '../components/common'
import { Button } from '../components/ui/button'
import type { Quote } from '../types'

export function Checkout() {
  const { data: session } = useSession()
  const user = session?.user
  const navigate = useNavigate()
  const client = useQueryClient()
  const cart = useCart(user)
  const wallets = useQuery({ queryKey: ['wallets', user?.id], queryFn: endpoints.wallets, enabled: Boolean(user) })
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [walletId, setWalletId] = useState('')
  const [network, setNetwork] = useState('Ethereum')
  const [provider, setProvider] = useState('Coinbase Wallet')
  const [connection, setConnection] = useState<'disconnected' | 'connected' | 'declined'>('disconnected')
  const [review, setReview] = useState<Quote | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const coupon = sessionStorage.getItem('kurio.coupon') ?? ''
  const quote = useQuery({ queryKey: ['quote', user?.id, cart.data?.items, coupon, network], queryFn: () => endpoints.quote(coupon, network), enabled: Boolean(user && cart.data) })
  const selectedWallet = walletId || wallets.data?.items[0]?.id || ''
  const currentWallet = wallets.data?.items.find((item) => item.id === selectedWallet)

  const validate = () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe os dados do colecionador.'); return false }
    if (!selectedWallet) { setError('Adicione ou selecione uma carteira.'); return false }
    if (connection !== 'connected') { setError('Conecte a carteira simulada para continuar.'); return false }
    return true
  }
  const beginReview = async () => {
    setError('')
    if (!validate()) return
    try {
      const fresh = await endpoints.quote(coupon, network)
      await client.invalidateQueries({ queryKey: ['quote'] })
      if (!fresh.valid) { setReview(null); setError(fresh.issues.join(' ')); return }
      setReview(fresh)
    } catch (cause) { setError(message(cause)) }
  }
  const submit = async () => {
    if (!review || !validate() || sending) return
    setSending(true); setError('')
    try {
      const fresh = await endpoints.quote(coupon, network)
      if (!fresh.valid || fresh.fingerprint !== review.fingerprint) {
        setReview(null); setError('O preço ou a disponibilidade mudou. Revise a cotação atualizada.')
        await client.invalidateQueries({ queryKey: ['quote'] }); return
      }
      let idempotencyKey = sessionStorage.getItem('kurio.checkout.idempotency')
      if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); sessionStorage.setItem('kurio.checkout.idempotency', idempotencyKey) }
      const payload = { idempotencyKey, fingerprint: fresh.fingerprint, coupon, network, walletId: selectedWallet, collector: name.trim() }
      try {
        const order = await endpoints.order(payload)
        void navigate({ to: '/orders/$id', params: { id: order.id } })
      } catch (cause) {
        const orders = await endpoints.orders().catch(() => null)
        const recovered = orders?.items.find((order) => order.idempotencyKey === idempotencyKey)
        if (recovered) { notify('Pedido existente recuperado com segurança.', 'info'); void navigate({ to: '/orders/$id', params: { id: recovered.id } }) }
        else setError(message(cause))
      }
    } catch (cause) { setError(message(cause)) }
    finally { setSending(false) }
  }

  if (cart.isLoading || wallets.isLoading) return <div className="container inner-page"><div className="skeleton checkout-skeleton"/></div>
  if (cart.isError || wallets.isError) return <div className="container inner-page"><ErrorState error={cart.error ?? wallets.error} retry={() => { void cart.refetch(); void wallets.refetch() }}/></div>
  if (!cart.data?.items.length) return <div className="container inner-page"><EmptyState title="Seu carrinho está vazio" detail="Adicione NFTs para iniciar o pagamento."/></div>

  return <div className="container inner-page checkout-page">
    <div className="breadcrumbs desktop-only"><Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Início</Link><span>/</span><span>Mercado</span><span>/</span><span>Pagamento</span></div>
    <div className="mobile-checkout-title mobile-only"><Link to="/cart"><ChevronLeft/></Link><h1>Pagamento com carteira</h1></div>
    <div className="checkout-layout">
      <section className="checkout-collector"><h1>Perfil do colecionador</h1>
        <div className="checkout-form-grid">
          <label><span>Nome de exibição*</span><input value={name} onChange={(event) => { setName(event.target.value); setReview(null) }}/></label>
          <label><span>Nome de usuário*</span><input value={name.toLowerCase().replace(/\s+/g, '.')} readOnly/></label>
          <label><span>Rede *</span><select value={network} onChange={(event) => { setNetwork(event.target.value); setReview(null); setConnection('disconnected') }}><option>Ethereum</option><option>Polygon</option></select></label>
          <label><span>Nome do perfil*</span><input value={name} readOnly/></label>
          <label><span>Endereço da carteira*</span><input value={currentWallet?.address ?? ''} readOnly placeholder="Endereço 0x da carteira"/></label>
          <label><span>ENS ou carteira secundária (opcional)</span><input placeholder="ENS ou carteira secundária (opcional)"/></label>
          <label><span>Tipo de carteira*</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
          <label><span>Código de indicação (opcional)</span><input/></label>
          <label><span>E-mail*</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setReview(null) }}/></label>
          <label className="ens-field"><span>Nome ENS (opcional)</span><div><select><option>.eth</option></select><input/></div></label>
          <label className="checkout-note"><span>Observação do colecionador (opcional)</span><textarea/></label>
        </div>
      </section>
      <aside className="checkout-side">
        <section className="mobile-wallet-picker"><div className="wallet-picker-title"><h2>Carteira conectada</h2><Link to="/wallets">Trocar carteira</Link></div>
          {wallets.data?.items.map((wallet) => <button key={wallet.id} className={selectedWallet === wallet.id ? 'selected' : ''} onClick={() => { setWalletId(wallet.id); setNetwork(wallet.network); setConnection('disconnected'); setReview(null) }}><span className="radio-dot"/><span><strong>{wallet.label}</strong><small>{wallet.primary ? wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4) : wallet.address}</small><small>Rede {wallet.network}</small></span><b>⋮</b></button>)}
        </section>
        <section className="provider-picker"><h2>Carteira e rede</h2>{['WalletConnect','MetaMask','Coinbase Wallet'].map((item) => <button key={item} className={provider === item ? 'selected' : ''} onClick={() => { setProvider(item); setConnection('connected'); setReview(null) }}><span className="provider-icon">{item[0]}</span>{item}<span className="radio-dot"/></button>)}</section>
        <section className="checkout-review desktop-only"><h2>Seus NFTs</h2>{quote.data?.lines.map((line) => <div className="checkout-line" key={line.nftId}><img src={line.nft.image} alt=""/><span><strong>{line.nft.title}</strong><small>ID do token: #{line.nft.title.match(/#(\d+)/)?.[1]}</small></span><small>(× {line.quantity})</small><Price value={line.lineTotal}/></div>)}</section>
        <Summary quote={quote.data} loading={quote.isLoading}/>
        {error && <p className="error-text" role="alert">{error}</p>}
        {connection === 'declined' && <p className="error-text">A conexão com a carteira foi recusada.</p>}
        {!review ? <Button className="checkout-submit" onClick={() => { if (connection === 'disconnected' && selectedWallet) setConnection('connected'); void beginReview() }} disabled={!quote.data?.valid || quote.isFetching}>Revisar compra</Button> : <Button className="checkout-submit" onClick={() => void submit()} disabled={sending}>{sending ? 'Enviando…' : 'Confirmar compra'}</Button>}
        <button className="simulate-refusal" onClick={() => { setConnection('declined'); setReview(null) }}>Simular recusa de conexão</button>
      </aside>
    </div>
  </div>
}
