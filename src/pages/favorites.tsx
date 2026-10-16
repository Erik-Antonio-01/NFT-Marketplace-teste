import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { endpoints } from '../api'
import { useFavorites, useSession } from '../hooks'
import { EmptyState, ErrorState, LoadingGrid, NftCard } from '../components/common'

export function Favorites() {
  const { data: session } = useSession(), user = session?.user
  const favorites = useFavorites(user)
  const catalog = useQuery({ queryKey: ['nfts', 'all-favorites'], queryFn: async () => {
    const result = await endpoints.catalog({ q: '', category: 'All', sort: 'featured', page: 1, max: '' })
    return Promise.all(Array.from({ length: result.pages }, (_, index) => index === 0 ? Promise.resolve(result) : endpoints.catalog({ q: '', category: 'All', sort: 'featured', page: index + 1, max: '' })))
  }, enabled: Boolean(user) })
  const items = catalog.data?.flatMap((page) => page.items).filter((nft) => favorites.data?.ids.includes(nft.id)) ?? []
  return <div className="container inner-page"><div className="page-title"><span className="eyebrow"><Heart size={15}/> CURATED BY YOU</span><h1>My favorites</h1><p>Artworks worth keeping close. Your choices are saved to your account.</p></div>
    {favorites.isLoading || catalog.isLoading ? <LoadingGrid count={4}/> : favorites.isError || catalog.isError ? <ErrorState error={favorites.error ?? catalog.error} retry={() => { void favorites.refetch(); void catalog.refetch() }}/>
      : items.length ? <div className="nft-grid">{items.map((nft) => <NftCard key={nft.id} nft={nft} user={user}/>)}</div> : <EmptyState title="Nenhum favorito ainda" detail="Explore o mercado e toque no coração dos NFTs que você mais gosta." />}
    <p className="muted text-sm mt-8"><Link className="text-link" to="/" search={{ q: '', category: 'All', sort: 'featured', page: 1, max: '' }}>Explorar mais NFTs →</Link></p>
  </div>
}
