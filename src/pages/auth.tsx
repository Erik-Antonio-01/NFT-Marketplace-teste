import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeOff, X } from 'lucide-react'
import { endpoints, message, TOKEN_KEY } from '../api'
import type { AuthMode } from '../auth-events'
import { notify } from '../hooks'
import { Button } from '../components/ui/button'

type AuthDialogProps = {
  open: boolean
  initialMode: AuthMode
  redirect?: string
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, initialMode, redirect, onOpenChange }: AuthDialogProps) {
  const client = useQueryClient()
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const login = mode === 'login'
  const mutation = useMutation({ mutationFn: login ? endpoints.login : (values: { email: string; password: string }) => endpoints.register({ ...values, name }) })

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setError('')
  }, [initialMode, open])

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
    mutation.reset()
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!login && name.trim().length < 2) { setError('Informe um nome de usuário com pelo menos 2 caracteres.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um e-mail válido.'); return }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!login && password !== confirm) { setError('As senhas não coincidem.'); return }

    try {
      const session = await mutation.mutateAsync({ email, password })
      localStorage.setItem(TOKEN_KEY, session.token)
      client.clear()
      client.setQueryData(['session'], { user: session.user })
      onOpenChange(false)
      notify(login ? 'Bem-vindo à Kurio.' : 'Seu perfil foi criado.', 'success')
      const destination = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : null
      if (destination) window.location.assign(destination)
    } catch (cause) { setError(message(cause)) }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay auth-overlay"/>
      <Dialog.Content className="auth-dialog" aria-describedby="auth-description">
        <Dialog.Close className="auth-dialog-close" aria-label="Fechar"><X/></Dialog.Close>
        <div className="auth-dialog-logo">KURIO</div>
        <div className="auth-tabs" role="tablist" aria-label="Autenticação"><button role="tab" aria-selected={login} className={login ? 'active' : ''} onClick={() => changeMode('login')}>Entrar</button><span>|</span><button role="tab" aria-selected={!login} className={!login ? 'active' : ''} onClick={() => changeMode('register')}>Criar conta</button></div>
        <Dialog.Title>{login ? 'Entrar' : 'Criar perfil de colecionador'}</Dialog.Title>
        <Dialog.Description id="auth-description">{login ? 'Entre para gerenciar sua carteira, coleção e perfil.' : 'Crie seu perfil e conecte uma carteira quando quiser.'}</Dialog.Description>
        <form onSubmit={(event) => void submit(event)} noValidate>
          {!login && <label><span>Nome de usuário</span><input required autoComplete="username" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome de usuário"/></label>}
          <label><span>E-mail</span><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contato@email.com"/></label>
          <label className="password-input"><span>Senha</span><input required autoComplete={login ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha"/><EyeOff/></label>
          {!login && <label className="password-input"><span>Confirmar senha</span><input required autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirmar senha"/><EyeOff/></label>}
          {login && <span className="forgot-password">Esqueceu a senha?</span>}
          {error && <p role="alert" className="error-text">{error}</p>}
          <Button className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Aguarde…' : login ? 'Entrar' : 'Criar conta'}</Button>
        </form>
        <div className="social-divider"><span/>Ou continue com<span/></div>
        <button className="social-button" type="button" disabled><strong className="google-mark">G</strong> Continuar com Google</button>
        <button className="social-button" type="button" disabled><strong className="facebook-mark">f</strong> Continuar com Facebook</button>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
