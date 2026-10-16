import type { AppStore, Nft } from '../types'

const FIGMA_ASSETS = [
  '/figma-assets/emerald-ape-042.webp',
  '/figma-assets/violet-nomad-314.webp',
  '/figma-assets/ivory-baron-088.webp',
  '/figma-assets/golden-beat-207.webp',
] as const

const catalog = [
  ['Emerald Ape #042', '1.19', 'Art'],
  ['Violet Nomad #314', '1.39', 'Photography'],
  ['Ivory Baron #088', '1.79', 'Collectibles'],
  ['Golden Beat #207', '0.99', 'Gaming'],
  ['Emerald Ape #118', '1.24', 'Art'],
  ['Violet Nomad #271', '1.52', 'Photography'],
  ['Ivory Baron #144', '1.88', 'Collectibles'],
  ['Golden Beat #301', '1.08', 'Gaming'],
  ['Emerald Ape #509', '1.31', 'Art'],
  ['Violet Nomad #620', '1.64', 'Photography'],
  ['Ivory Baron #712', '2.02', 'Collectibles'],
  ['Golden Beat #811', '1.16', 'Gaming'],
] as const

export const seedNfts: Nft[] = catalog.map(([title, price, category], index) => ({
  id: `nft-${index + 1}`,
  title,
  artist: 'Kurio Editions',
  category,
  description: index === 0
    ? 'Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum.'
    : `Colecionável digital da série ${title.split(' #')[0]}, criado pela Kurio Editions e verificado na Ethereum.`,
  image: FIGMA_ASSETS[index % FIGMA_ASSETS.length],
  editions: [
    { id: 'one', label: '1/1', priceEth: (Number(price) * 1.8).toFixed(2), available: 1 },
    { id: 'ten', label: '1/10', priceEth: (Number(price) * 1.25).toFixed(2), available: 10 },
    { id: 'standard', label: '1/50', priceEth: price, available: 50 },
    { id: 'open', label: 'ABERTA', priceEth: (Number(price) * 0.75).toFixed(2), available: 250 },
  ],
  version: 1,
  featured: index < 4,
}))

export const seed = (): AppStore => ({
  nfts: structuredClone(seedNfts),
  accounts: [
    { id: 'user-ava', name: 'Alex Morgan', email: 'alex@example.com', avatar: FIGMA_ASSETS[0], joinedAt: '2025-06-21', passwordHash: 'b59d1188f44228cd8f691a574d34e77fcbaea0588530eeb09c02250f64be9df0', favorites: ['nft-1', 'nft-4'], cart: [], wallets: [{ id: 'wallet-alex', label: 'Principal', address: '0x1234567890abcdef1234567890abcdef12345678', network: 'Ethereum', primary: true }] },
    { id: 'user-sam', name: 'Sam Rivera', email: 'sam@example.com', avatar: FIGMA_ASSETS[1], joinedAt: '2025-11-05', passwordHash: 'b59d1188f44228cd8f691a574d34e77fcbaea0588530eeb09c02250f64be9df0', favorites: ['nft-2'], cart: [], wallets: [{ id: 'wallet-sam', label: 'Reserva', address: '0xabcdef1234567890abcdef1234567890abcdef12', network: 'Polygon', primary: true }] },
  ],
  guestCart: [], session: null, orders: [], scenario: 'default', eventSequence: 0,
})
