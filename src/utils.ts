import type { CartItem } from './types'

export const cartKey = (item: CartItem) => `${item.nftId}:${item.editionId}`

export const clearCheckoutAttempt = () => sessionStorage.removeItem('kurio.checkout.attempt')
