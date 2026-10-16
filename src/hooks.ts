import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { endpoints, TOKEN_KEY } from './api'
import type { CartItem, NftEvent, OrderEvent, User } from './types'

export const notify = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
  window.dispatchEvent(new CustomEvent('kurio:notice', { detail: { text, type } }))
}
export const useSession = () => useQuery({ queryKey: ['session'], queryFn: endpoints.session })
export const useCart = (user?: User | null) => useQuery({ queryKey: ['cart', user?.id ?? 'guest'], queryFn: endpoints.cart })
export const useFavorites = (user?: User | null) => useQuery({ queryKey: ['favorites', user?.id], queryFn: endpoints.favorites, enabled: Boolean(user) })

export function useCartActions() {
  const client = useQueryClient()
  const settle = () => { void client.invalidateQueries({ queryKey: ['cart'] }); void client.invalidateQueries({ queryKey: ['quote'] }) }
  const add = useMutation({ mutationFn: endpoints.add, onSuccess: () => { settle(); notify('Adicionado ao carrinho.', 'success') } })
  const quantity = useMutation({ mutationFn: ({ id, value }: { id: string; value: number }) => endpoints.quantity(id, value), onSuccess: settle })
  const remove = useMutation({ mutationFn: endpoints.remove, onSuccess: settle })
  return { add, quantity, remove }
}

export function useFavoriteAction(user?: User | null) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => endpoints.favorite(id, active),
    onMutate: async ({ id, active }) => {
      const queryKey = ['favorites', user?.id]
      await client.cancelQueries({ queryKey })
      const previous = client.getQueryData<{ ids: string[] }>(queryKey)
      client.setQueryData(queryKey, { ids: active ? [...(previous?.ids ?? []), id] : (previous?.ids ?? []).filter((item) => item !== id) })
      return { previous, queryKey }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(context.queryKey, context.previous)
      notify('Não foi possível atualizar seus favoritos. A alteração foi desfeita.', 'error')
    },
    onSettled: () => { void client.invalidateQueries({ queryKey: ['favorites', user?.id] }) },
  })
}

export function useRealtime(user?: User | null) {
  const client = useQueryClient()
  useEffect(() => {
    document.documentElement.dataset.realtime = 'loading'
    const latest = new Map<string, number>()
    let socket: Socket | undefined
    let cancelled = false
    const reconcile = () => {
      void client.invalidateQueries({ queryKey: ['nfts'] })
      void client.invalidateQueries({ queryKey: ['nft'] })
      void client.invalidateQueries({ queryKey: ['cart'] })
      void client.invalidateQueries({ queryKey: ['quote'] })
      if (user) void client.invalidateQueries({ queryKey: ['order', user.id] })
    }
    const accept = (id: string, version: number) => {
      if (version <= (latest.get(id) ?? 0)) return false
      latest.set(id, version); return true
    }
    const connect = async () => {
      // O bundle explícito captura o WebSocket já interceptado pelo MSW.
      const { io } = await import('socket.io-client-browser')
      if (cancelled) return
      socket = io('ws://kurio.local', { transports: ['websocket'], path: '/socket.io/', reconnection: true, reconnectionDelay: 500 })
      document.documentElement.dataset.realtime = 'connecting'
      socket.on('connect', () => {
        document.documentElement.dataset.realtime = 'connected'
        socket?.emit('sync'); reconcile()
      })
      socket.on('disconnect', () => { document.documentElement.dataset.realtime = 'reconnecting' })
      socket.on('connect_error', (error) => { document.documentElement.dataset.realtime = `error:${error.message}` })
      socket.on('nft.updated', (event: NftEvent) => {
        if (!accept(`nft:${event.resourceId}`, event.version)) return
        reconcile(); notify(`${event.nft.title} teve o preço ou a disponibilidade atualizados.`, 'info')
      })
      socket.on('order.updated', (event: OrderEvent) => {
        if (!user || event.userId !== user.id || !accept(`order:${event.resourceId}`, event.version)) return
        void client.invalidateQueries({ queryKey: ['order', user.id, event.resourceId] })
        void client.invalidateQueries({ queryKey: ['cart'] })
        notify(event.order.status === 'confirmed' ? 'Pedido confirmado.' : 'Pedido recusado.', event.order.status === 'confirmed' ? 'success' : 'info')
      })
    }
    void connect()
    return () => { cancelled = true; socket?.removeAllListeners(); socket?.disconnect() }
  }, [client, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSessionExpiry() {
  const client = useQueryClient()
  useEffect(() => {
    const expire = () => { localStorage.removeItem(TOKEN_KEY); client.clear(); notify('Sua sessão expirou. Entre novamente para continuar.', 'error') }
    window.addEventListener('kurio:session-expired', expire)
    return () => window.removeEventListener('kurio:session-expired', expire)
  }, [client])
}

export function cartCount(items: CartItem[] = []) { return items.reduce((count, item) => count + item.quantity, 0) }
