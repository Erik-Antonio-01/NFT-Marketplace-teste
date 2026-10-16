import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { subscribe } from './store'

let interceptor: WebSocketInterceptor | undefined

export function startSocketMock() {
  if (interceptor) return interceptor
  interceptor = new WebSocketInterceptor()
  interceptor.apply()
  interceptor.on('connection', (connection) => {
    if (!connection.client.url.href.startsWith('ws://kurio.local/socket.io/')) return
    const io = toSocketIo({ ...connection, params: {} })
    connection.client.send(`0${JSON.stringify({ sid: 'kurio-mock', upgrades: [], pingInterval: 25_000, pingTimeout: 5_000, maxPayload: 1_000_000 })}`)
    connection.client.addEventListener('message', (event) => {
      if (event.data === '40') connection.client.send(`40${JSON.stringify({ sid: 'kurio-mock' })}`)
      if (event.data === '2') connection.client.send('3')
    })
    const unsubscribe = subscribe((event) => {
      try { io.client.emit(event.type, event.payload) } catch { /* Conexão encerrada. */ }
    })
    connection.client.addEventListener('close', unsubscribe)
    io.client.on('sync', () => io.client.emit('sync.ready', { at: Date.now() }))
  })
  return interceptor
}
