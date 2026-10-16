import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { endpoints } from '../api'
import { useSession } from '../hooks'
import { EmptyState, ErrorState, LoadingGrid, MobileSearch, NftCard } from '../components/common'
import { HomeEditorial } from '../components/sections'
import type { CatalogCategory, CatalogSearch, CatalogSort } from '../types'

const collections: Array<{ label: string; category: CatalogCategory; count: number }> = [
  { label: 'Todas as coleções', category: 'All', count: 99 },
  { label: 'Arte digital', category: 'Art', count: 33 },
  { label: 'Fotografia', category: 'Photography', count: 12 },
  { label: 'Avatares', category: 'Collectibles', count: 27 },
  { label: 'Música', category: 'Gaming', count: 18 },
]

export function Home() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [mobileFilters, setMobileFilters] = useState(false)
  const catalog = useQuery({ queryKey: ['nfts', search], queryFn: ({ signal }) => endpoints.catalog(search, signal), placeholderData: (old) => old })
  const update = (patch: Partial<CatalogSearch>) => void navigate({ to: '/', search: { ...search, ...patch, page: patch.page ?? 1 } })

  return <div className="home-page">
    <div className="container"><MobileSearch value={search.q} onChange={(q) => update({ q })} onFilter={() => setMobileFilters((value) => !value)} /></div>

    <section className="hero container">
      <div className="hero-copy">
        <p className="hero-kicker">Bem-vindo à Kurio</p>
        <h1><span className="desktop-only">SEJA DONO DO FUTURO<br/>DA ARTE DIGITAL</span><span className="mobile-only">SEJA DONO DA<br/>CULTURA DIGITAL</span></h1>
        <p><span className="desktop-only">Descubra NFTs selecionados de criadores emergentes e consagrados.<br/> Colecione arte digital rara, apoie artistas e tenha uma parte da<br/> cultura da internet.</span><span className="mobile-only">Descubra NFTs selecionados de criadores do mundo todo.</span></p>
        <a href="#catalogo" className="button button-primary">EXPLORAR <ArrowRight size={18}/></a>
      </div>
      <div className="hero-art">
        <img className="hero-primary" src="/figma-assets/emerald-ape-042.webp" alt="Emerald Ape #042" fetchPriority="high" />
        <img className="hero-secondary" src="/figma-assets/violet-nomad-314.webp" alt="Violet Nomad #314" />
      </div>
      <div className="hero-dots" aria-label="Destaque 1 de 3"><span/><span/><span/></div>
    </section>

    <section className="container catalog-section" id="catalogo">
      <div className="catalog-toolbar">
        <div className="catalog-tabs" role="group" aria-label="Tipo de listagem">
          <button className="active" onClick={() => update({ sort: 'featured' })}>Todos os NFTs</button>
          <button onClick={() => update({ sort: 'name' })}>Novos lançamentos</button>
          <button onClick={() => update({ sort: 'price-desc' })}>Em alta</button>
        </div>
        <label className="catalog-sort">Ordenar por:
          <select aria-label="Ordenar NFTs" value={search.sort} onChange={(event) => update({ sort: event.target.value as CatalogSort })}>
            <option value="featured">Listados recentemente</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name">Nome</option>
          </select>
        </label>
      </div>

      <div className="catalog-layout">
        <aside className={`collection-filter ${mobileFilters ? 'open' : ''}`}>
          <h2>Coleções</h2>
          {collections.map((collection) => <button key={collection.category} className={search.category === collection.category ? 'active' : ''} onClick={() => { update({ category: collection.category }); setMobileFilters(false) }}>
            <span>{collection.label}</span><strong>({collection.count})</strong>
          </button>)}
          <label className="filter-search"><span>Buscar na coleção</span><input value={search.q} onChange={(event) => update({ q: event.target.value })} placeholder="Nome ou criador"/></label>
          <label className="filter-search"><span>Preço máximo</span><select value={search.max} onChange={(event) => update({ max: event.target.value })}><option value="">Sem limite</option><option value="1">1 ETH</option><option value="1.5">1.5 ETH</option><option value="2">2 ETH</option></select></label>
        </aside>

        <div className="catalog-results">
          {catalog.isFetching && !catalog.isLoading && <span className="updating" aria-live="polite">Atualizando coleção…</span>}
          {catalog.isLoading ? <LoadingGrid count={6}/> : catalog.isError ? <ErrorState error={catalog.error} retry={() => void catalog.refetch()}/> : !catalog.data?.items.length ? <EmptyState title="Nenhum NFT encontrado" detail="Tente outra busca ou escolha uma coleção diferente."/> : <>
            <div className="nft-grid">{catalog.data.items.map((nft) => <NftCard key={nft.id} nft={nft} user={session?.user}/>)}</div>
            <nav className="pagination" aria-label="Páginas do catálogo">
              <button disabled={search.page <= 1} onClick={() => update({ page: search.page - 1 })} aria-label="Página anterior"><ChevronLeft/></button>
              <span>{search.page} / {catalog.data.pages}</span>
              <button disabled={search.page >= catalog.data.pages} onClick={() => update({ page: search.page + 1 })} aria-label="Próxima página"><ChevronRight/></button>
            </nav>
          </>}
        </div>
      </div>
    </section>
    <HomeEditorial/>
  </div>
}
