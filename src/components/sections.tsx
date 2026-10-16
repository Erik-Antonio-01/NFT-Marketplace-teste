import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api'
import { useSession } from '../hooks'
import type { CatalogCategory } from '../types'
import { homeSearch, LoadingGrid, NftCard } from './common'

const journal = [
  { image: '/figma-assets/ivory-baron-088.webp', date: '12 de setembro', read: 'Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '/figma-assets/emerald-ape-042.webp', date: '13 de setembro', read: 'Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: '/figma-assets/violet-nomad-314.webp', date: '15 de setembro', read: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: '/figma-assets/golden-beat-207.webp', date: '15 de setembro', read: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function HomeEditorial() {
  return <>
    <section className="container promo-grid" aria-label="Destaques editoriais">
      <article className="promo-card"><img src="/figma-assets/emerald-ape-042.webp" alt="Emerald Ape #042"/><div><h2>Lançamentos gênesis<br/>de edição limitada</h2><p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><a href="#catalogo">Explorar →</a></div></article>
      <article className="promo-card"><img src="/figma-assets/ivory-baron-088.webp" alt="Ivory Baron #088"/><div><h2>Arte digital selecionada<br/>e muito mais</h2><p>Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.</p><a href="#catalogo">Explorar →</a></div></article>
    </section>
    <section className="container journal-section" id="aprenda">
      <header><h2>Diário da Cunhagem</h2><p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p></header>
      <div className="journal-grid">{journal.map((entry) => <article className="journal-card" key={entry.title}>
        <img src={entry.image} alt="" loading="lazy"/><div><small>{entry.date}<span/> {entry.read}</small><h3>{entry.title}</h3><p>{entry.text}</p><a href="#aprenda">Ler mais</a></div>
      </article>)}</div>
    </section>
  </>
}

export function NftRecommendations({ title, excludeId, category = 'All', limit = 4 }: { title: string; excludeId?: string; category?: CatalogCategory; limit?: number }) {
  const { data: session } = useSession()
  const catalog = useQuery({ queryKey: ['recommendations', category], queryFn: ({ signal }) => endpoints.catalog({ ...homeSearch, page: 1 }, signal) })
  const items = catalog.data?.items.filter((nft) => nft.id !== excludeId).sort((a, b) => Number(b.category === category) - Number(a.category === category)).slice(0, limit) ?? []
  return <section className="container recommendation-section"><div className="section-heading"><h2>{title}</h2><Link to="/" search={homeSearch}>Ver todos →</Link></div>{catalog.isLoading ? <LoadingGrid count={limit}/> : <div className="nft-grid recommendation-grid">{items.map((nft) => <NftCard key={nft.id} nft={nft} user={session?.user}/>)}</div>}</section>
}
