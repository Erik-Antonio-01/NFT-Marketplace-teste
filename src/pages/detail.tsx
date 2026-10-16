import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Heart, Minus, Plus, Search } from 'lucide-react'
import { endpoints, message } from '../api'
import { notify, useCartActions, useFavoriteAction, useFavorites, useSession } from '../hooks'
import { EmptyState, ErrorState, Price } from '../components/common'
import { Button } from '../components/ui/button'
import { requestAuth } from '../auth-events'
import { NftRecommendations } from '../components/sections'

export function Detail() {
  const { id } = useParams({ from: '/nft/$id' })
  const navigate = useNavigate()
  const { data: session } = useSession()
  const user = session?.user
  const nftQuery = useQuery({ queryKey: ['nft', id], queryFn: ({ signal }) => endpoints.nft(id, signal) })
  const [editionId, setEditionId] = useState('standard')
  const [quantity, setQuantity] = useState(1)
  const actions = useCartActions()
  const favorites = useFavorites(user)
  const favorite = useFavoriteAction(user)
  const nft = nftQuery.data
  const edition = nft?.editions.find((item) => item.id === editionId)
  const saved = favorites.data?.ids.includes(id)

  useEffect(() => { setEditionId('standard'); setQuantity(1) }, [id])
  const buy = async () => {
    if (!edition || !nft) return
    try {
      await actions.add.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity })
      void navigate({ to: '/cart' })
    } catch (error) { notify(message(error), 'error') }
  }

  if (nftQuery.isLoading) return <div className="container detail-page">
    <div className="breadcrumbs desktop-only"><Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Início</Link><span>/</span><span>Mercado</span></div>
    <div className="detail-layout detail-loading"><div className="skeleton detail-main-art"/><div className="skeleton detail-copy-skeleton"/></div>
  </div>
  if (nftQuery.isError) return <div className="container inner-page">{(nftQuery.error as { response?: { status: number } })?.response?.status === 404 ? <EmptyState title="NFT não encontrado" detail="Este colecionável pode ter sido removido."/> : <ErrorState error={nftQuery.error} retry={() => void nftQuery.refetch()}/>}</div>
  if (!nft) return null
  const token = nft.title.match(/#(\d+)/)?.[1] ?? nft.id.replace('nft-', '').padStart(4, '0')

  return <div className="container detail-page">
    <div className="breadcrumbs desktop-only"><Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Início</Link><span>/</span><span>Mercado</span></div>
    <Link to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }} className="mobile-back mobile-only" aria-label="Voltar"><ChevronLeft/></Link>
    <button className={`mobile-favorite mobile-only ${saved ? 'saved' : ''}`} aria-label="Favoritar NFT" onClick={() => user ? favorite.mutate({ id, active: !saved }) : requestAuth('login', `/nft/${id}`)}><Heart fill={saved ? 'currentColor' : 'none'}/></button>
    <div className="detail-layout">
      <div className="detail-gallery">
        <div className="detail-thumbnails desktop-only">{[0,1,2,3].map((index) => <button key={index} className={index === 0 ? 'selected' : ''} aria-label={`Visualização ${index + 1}`}><img src={nft.image} alt=""/></button>)}</div>
        <div className="detail-main-art"><img src={nft.image} width="640" height="640" alt={nft.title}/><Search className="detail-zoom desktop-only"/></div>
      </div>
      <section className="detail-info">
        <div className="detail-title-row"><h1>{nft.title}</h1><span className="rating">★ 4.8<span>(19)</span></span></div>
        <div className="desktop-detail-price desktop-only"><Price value={edition?.priceEth ?? '0'}/><span>★★★★★ 19 avaliações de colecionadores</span></div>
        <h2 className="desktop-only">Sobre este NFT:</h2>
        <p className="detail-description">{nft.description}</p>
        <strong className="field-heading">Edição:</strong>
        <div className="edition-options">{nft.editions.map((item) => <button key={item.id} className={item.id === editionId ? 'active' : ''} disabled={!item.available} onClick={() => { setEditionId(item.id); setQuantity(1) }}>{item.label}</button>)}</div>
        <div className="detail-actions desktop-only">
          <div className="quantity-stepper"><button aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus/></button><span>{quantity}</span><button aria-label="Aumentar quantidade" disabled={quantity >= (edition?.available ?? 0)} onClick={() => setQuantity((value) => Math.min(edition?.available ?? 1, value + 1))}><Plus/></button></div>
          <Button onClick={() => void buy()} disabled={!edition?.available || actions.add.isPending}>COMPRAR</Button>
          <button className={`favorite-text ${saved ? 'saved' : ''}`} onClick={() => user ? favorite.mutate({ id, active: !saved }) : requestAuth('login', `/nft/${id}`)}><Heart fill={saved ? 'currentColor' : 'none'}/> Favoritar</button>
        </div>
        <dl className="nft-meta">
          <div><dt>ID do token:</dt><dd>#{token.padStart(4, '0')}</dd></div>
          <div><dt>Coleção:</dt><dd>Kurio Apes</dd></div>
          <div><dt>Atributos:</dt><dd>Óculos, Esmeralda, Raro</dd></div>
        </dl>
        <div className="mobile-buy mobile-only"><Price value={edition?.priceEth ?? '0'}/><div className="quantity-stepper"><button aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus/></button><span>{quantity}</span><button aria-label="Aumentar quantidade" disabled={quantity >= (edition?.available ?? 0)} onClick={() => setQuantity((value) => Math.min(edition?.available ?? 1, value + 1))}><Plus/></button></div><Button onClick={() => void buy()} disabled={!edition?.available || actions.add.isPending}>COMPRAR</Button></div>
      </section>
    </div>
    <div className="detail-tabs desktop-only"><a className="active" href="#detalhes-do-nft">Detalhes do NFT</a><a href="#avaliacoes">Avaliações de colecionadores (19)</a></div>
    <section className="detail-expanded" id="detalhes-do-nft">
      <div><h2>Detalhes do NFT</h2><p>{nft.description}</p><dl><div><dt>Criador</dt><dd>{nft.artist}</dd></div><div><dt>Coleção</dt><dd>Kurio Apes</dd></div><div><dt>Blockchain</dt><dd>Ethereum</dd></div><div><dt>Padrão do token</dt><dd>ERC-721</dd></div><div><dt>Royalties do criador</dt><dd>5%</dd></div><div><dt>Propriedades</dt><dd>Óculos · Esmeralda · Raro</dd></div></dl></div>
      <div id="avaliacoes"><h2>Avaliações de colecionadores</h2><article><span>★★★★★</span><p>Arte impecável e procedência clara. A experiência de compra foi simples e segura.</p><strong>Marina C.</strong></article><article><span>★★★★★</span><p>Uma edição marcante da coleção Kurio. Os detalhes da obra são excelentes.</p><strong>Rafael M.</strong></article></div>
    </section>
    <NftRecommendations title="Mais desta coleção" excludeId={nft.id} category={nft.category} limit={4}/>
  </div>
}
