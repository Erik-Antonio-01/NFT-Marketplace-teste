import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints, message } from '../api'
import { useSession, notify } from '../hooks'
import type { Wallet } from '../types'
import { Button } from '../components/ui/button'
import { ErrorState } from '../components/common'
import { ProfileMenu } from './profile'

const empty = { label: '', address: '', network: 'Ethereum', primary: false }

export function Wallets() {
  const { data: session } = useSession()
  const user = session?.user
  const client = useQueryClient()
  const wallets = useQuery({ queryKey: ['wallets', user?.id], queryFn: endpoints.wallets, enabled: Boolean(user) })
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const save = useMutation({ mutationFn: async () => {
    const data = { ...form, label: form.label.trim(), address: form.address.trim() }
    return editing ? endpoints.editWallet(editing, data) : endpoints.createWallet(data)
  }, onSuccess: (data) => {
    client.setQueryData(['wallets', user?.id], data)
    void client.invalidateQueries({ queryKey: ['wallets'] })
    setEditing(null)
    setForm(empty)
    notify('Carteira salva.', 'success')
  } })

  useEffect(() => {
    const primary = wallets.data?.items.find((wallet) => wallet.primary) ?? wallets.data?.items[0]
    if (!primary || editing) return
    setEditing(primary.id)
    setForm({ label: primary.label, address: primary.address, network: primary.network, primary: primary.primary })
  }, [wallets.data, editing])

  const start = (wallet?: Wallet) => {
    setEditing(wallet?.id ?? null)
    setForm(wallet ? { label: wallet.label, address: wallet.address, network: wallet.network, primary: wallet.primary } : { ...empty, primary: !wallets.data?.items.length })
    setError('')
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (!form.label.trim() || !/^0x[a-fA-F0-9]{40}$/.test(form.address.trim())) { setError('Informe um nome e um endereço 0x com 40 caracteres hexadecimais.'); return }
    try { await save.mutateAsync() } catch (cause) { setError(message(cause)) }
  }

  if (wallets.isError) return <div className="container inner-page"><ErrorState error={wallets.error} retry={() => void wallets.refetch()}/></div>

  return <div className="container inner-page profile-page"><ProfileMenu active="wallets"/>
    <main className="profile-content wallet-content">
      <div className="wallet-heading"><div><h1>Carteira principal</h1><p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div><button onClick={() => start()}>Adicionar carteira</button></div>
      {wallets.isLoading ? <div className="skeleton wallet-skeleton"/> : <form onSubmit={(event) => void submit(event)} className="profile-form wallet-profile-form">
        <label><span>Nome de exibição*</span><input value={user?.name ?? ''} readOnly/></label>
        <label><span>Apelido da carteira*</span><input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })}/></label>
        <label><span>Rede *</span><select value={form.network} onChange={(event) => setForm({ ...form, network: event.target.value })}><option>Ethereum</option><option>Polygon</option></select></label>
        <label><span>Nome do perfil*</span><input value={user?.name ?? ''} readOnly/></label>
        <label><span>Endereço da carteira*</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Endereço 0x da carteira"/></label>
        <label><span>ENS ou carteira secundária (opcional)</span><input placeholder="ENS ou carteira secundária (opcional)"/></label>
        <label><span>Tipo de carteira*</span><select><option>Selecione uma carteira</option><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
        <label><span>Código de indicação (opcional)</span><input/></label>
        <label><span>E-mail*</span><input type="email" value={user?.email ?? ''} readOnly/></label>
        <label className="ens-field"><span>Nome ENS (opcional)</span><div><select><option>.eth</option></select><input/></div></label>
        {error && <p role="alert" className="error-text">{error}</p>}
        <Button type="submit" disabled={save.isPending}>Salvar carteira</Button>
      </form>}
      <section className="secondary-wallets"><h2>Carteira secundária</h2>{wallets.data?.items.filter((wallet) => !wallet.primary).map((wallet) => <button key={wallet.id} onClick={() => start(wallet)}>{wallet.label} · {wallet.address.slice(0, 8)}…</button>)}</section>
    </main>
  </div>
}
