import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Mail, X, XCircle } from 'lucide-react'
import { endpoints } from '../api'
import { useSession } from '../hooks'
import { EmptyState, ErrorState, Price } from '../components/common'

const icon = { confirmed: CheckCircle2, pending: Clock3, declined: XCircle }
const statusText = { confirmed: 'Pedido confirmado', pending: 'Pedido em processamento', declined: 'Pagamento recusado' }

export function Orders() {
  const { data: session } = useSession()
  const user = session?.user
  const orders = useQuery({ queryKey: ['orders', user?.id], queryFn: endpoints.orders, enabled: Boolean(user), refetchInterval: (query) => query.state.data?.items.some((item) => item.status === 'pending') ? 1200 : false })
  return <div className="container inner-page"><h1>Atividade</h1>
    {orders.isLoading ? <div className="skeleton order-skeleton"/> : orders.isError ? <ErrorState error={orders.error} retry={() => void orders.refetch()}/> : !orders.data?.items.length ? <EmptyState title="Nenhum pedido" detail="Seus NFTs comprados aparecerão aqui."/> : <div className="order-list">{orders.data.items.slice().reverse().map((order) => { const Icon = icon[order.status]; return <Link to="/orders/$id" params={{ id: order.id }} className="order-list-item" key={order.id}><Icon/><span><strong>{statusText[order.status]}</strong><small>#{order.id.slice(0,8)}</small></span><Price value={order.quote.total}/></Link> })}</div>}
  </div>
}

export function OrderDetail() {
  const { id } = useParams({ from: '/orders/$id' })
  const { data: session } = useSession()
  const user = session?.user
  const client = useQueryClient()
  const order = useQuery({ queryKey: ['order', user?.id, id], queryFn: () => endpoints.orderById(id), enabled: Boolean(user), refetchInterval: (query) => query.state.data?.status === 'pending' ? 1000 : false })

  useEffect(() => {
    if (!order.data || order.data.status === 'pending') return
    void client.invalidateQueries({ queryKey: ['cart'] })
    void client.invalidateQueries({ queryKey: ['orders', user?.id] })
    sessionStorage.removeItem('kurio.checkout.idempotency')
    if (order.data.status === 'confirmed') sessionStorage.removeItem('kurio.coupon')
  }, [client, order.data, user?.id])

  if (order.isLoading) return <div className="receipt-page"><div className="skeleton receipt-modal"/></div>
  if (order.isError) return <div className="container inner-page"><ErrorState error={order.error} retry={() => void order.refetch()}/></div>
  if (!order.data) return null
  const receipt = order.data

  return <div className="receipt-page"><section className={`receipt-modal receipt-${receipt.status}`}>
    <Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }} className="receipt-close" aria-label="Fechar"><X/></Link>
    {receipt.status === 'confirmed' ? <Mail className="receipt-icon"/> : receipt.status === 'pending' ? <Clock3 className="receipt-icon"/> : <XCircle className="receipt-icon"/>}
    <h1>{receipt.status === 'confirmed' ? 'Seus NFTs agora estão na sua carteira' : statusText[receipt.status]}</h1>
    <div className="receipt-stats"><div><span>ID da transação</span><strong>{receipt.txHash ? receipt.txHash.slice(0,6) + '…' + receipt.txHash.slice(-4) : receipt.id.slice(0,12)}</strong></div><div><span>Data</span><strong>{new Date(receipt.createdAt).toLocaleDateString('pt-BR')}</strong></div><div><span>Total</span><strong><Price value={receipt.quote.total}/></strong></div><div><span>Carteira</span><strong>{receipt.wallet.label}</strong></div></div>
    <div className="receipt-details"><h2>Detalhes da transação</h2><div className="receipt-table-head"><span>NFTs</span><span>Edições</span><span>Subtotal</span></div>
      {receipt.quote.lines.map((line) => <div className="receipt-line" key={`${line.nftId}:${line.editionId}`}><img src={line.nft.image} alt=""/><span><strong>{line.nft.title}</strong><small>ID do token: #{line.nft.title.match(/#(\d+)/)?.[1]}</small></span><small>(× {line.quantity})</small><Price value={line.lineTotal}/></div>)}
    </div>
    {receipt.status === 'declined' && <Link className="button button-primary" to="/cart">Voltar ao carrinho</Link>}
  </section></div>
}
