import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Heart, LogOut, MapPin, ShoppingCart, TrendingUp, UserRound } from 'lucide-react'
import { endpoints, message, TOKEN_KEY } from '../api'
import { notify, useSession } from '../hooks'
import { ErrorState } from '../components/common'
import { Button } from '../components/ui/button'

const avatars = ['/figma-assets/emerald-ape-042.webp', '/figma-assets/violet-nomad-314.webp', '/figma-assets/ivory-baron-088.webp', '/figma-assets/golden-beat-207.webp']

function ProfileMenu({ active }: { active: 'profile' | 'wallets' }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const logout = async () => {
    try { await endpoints.logout() } finally {
      localStorage.removeItem(TOKEN_KEY)
      client.clear()
      void navigate({ to: '/', search: { q: '', category: 'All', sort: 'featured', page: 1, max: '' } })
    }
  }
  return <aside className="profile-menu"><h2>Meu perfil</h2>
    <Link to="/profile" className={active === 'profile' ? 'active' : ''}><UserRound/> Dados do perfil</Link>
    <Link to="/wallets" className={active === 'wallets' ? 'active' : ''}><MapPin/> Carteiras</Link>
    <Link to="/orders"><ShoppingCart/> Atividade</Link>
    <Link to="/favorites"><Heart/> Lista de interesse</Link>
    <span className="menu-static"><TrendingUp/> Ofertas</span>
    <span className="menu-static"><Download/> Arquivos baixados</span>
    <span className="menu-static"><AlertTriangle/> Suporte</span>
    <button className="menu-logout" onClick={() => void logout()}><LogOut/> Sair</button>
  </aside>
}

export function Profile() {
  const { data: session } = useSession()
  const user = session?.user
  const client = useQueryClient()
  const profile = useQuery({ queryKey: ['profile', user?.id], queryFn: endpoints.profile, enabled: Boolean(user) })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [walletName, setWalletName] = useState('')
  const [avatar, setAvatar] = useState(avatars[0])
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!profile.data) return
    setName(profile.data.name)
    setEmail(profile.data.email)
    setUsername(profile.data.name.toLowerCase().replace(/\s+/g, '.'))
    setWalletName('Principal')
    setAvatar(profile.data.avatar)
  }, [profile.data])

  const save = useMutation({ mutationFn: endpoints.updateProfile, onSuccess: (value) => {
    client.setQueryData(['profile', user?.id], value)
    client.setQueryData(['session'], { user: value })
    notify('Perfil atualizado.', 'success')
  } })
  const changePassword = useMutation({ mutationFn: () => endpoints.password(current, next), onSuccess: () => {
    setCurrent(''); setNext(''); setConfirm(''); notify('Senha alterada.', 'success')
  } })

  const update = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe nome e e-mail válidos.'); return }
    try { await save.mutateAsync({ name, email, avatar }) } catch (cause) { setError(message(cause)) }
  }
  const passwordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPasswordError('')
    if (next !== confirm) { setPasswordError('As novas senhas não coincidem.'); return }
    try { await changePassword.mutateAsync() } catch (cause) { setPasswordError(message(cause)) }
  }

  if (profile.isLoading) return <div className="container inner-page"><div className="skeleton profile-skeleton"/></div>
  if (profile.isError) return <div className="container inner-page"><ErrorState error={profile.error} retry={() => void profile.refetch()}/></div>

  return <div className="container inner-page profile-page"><ProfileMenu active="profile"/>
    <main className="profile-content"><h1>Perfil do colecionador</h1>
      <form onSubmit={(event) => void update(event)} className="profile-form">
        <label><span>Nome de exibição*</span><input value={name} onChange={(event) => setName(event.target.value)}/></label>
        <label><span>Nome de usuário</span><input value={username} readOnly/></label>
        <label><span>E-mail*</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
        <label className="ens-field"><span>Nome ENS</span><div><select><option>.eth</option></select><input value={username} readOnly/></div></label>
        <label><span>Apelido da carteira</span><input value={walletName} readOnly/></label>
        <div className="profile-avatar"><span>Avatar</span><div><img src={avatar} alt="Avatar selecionado"/><Button type="button" onClick={() => setAvatar(avatars[(avatars.indexOf(avatar) + 1) % avatars.length])}>Alterar</Button><button type="button" onClick={() => setAvatar(avatars[0])}>Remover</button></div></div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <Button type="submit" disabled={save.isPending}>Salvar perfil</Button>
      </form>
      <form onSubmit={(event) => void passwordSubmit(event)} className="password-form"><h2>Alterar senha</h2>
        <label><span>Senha atual</span><input type="password" value={current} onChange={(event) => setCurrent(event.target.value)}/></label>
        <label><span>Nova senha</span><input type="password" minLength={8} value={next} onChange={(event) => setNext(event.target.value)}/></label>
        <label><span>Confirmar nova senha</span><input type="password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)}/></label>
        {passwordError && <p className="error-text" role="alert">{passwordError}</p>}
        <Button variant="outline" type="submit" disabled={changePassword.isPending}>Alterar senha</Button>
      </form>
    </main>
  </div>
}

export { ProfileMenu }
