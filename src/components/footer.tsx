import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BellRing, Facebook, Instagram, Linkedin, ShieldCheck, Sparkles, Twitter, Youtube } from 'lucide-react'

const homeSearch = { q: '', category: 'All' as const, sort: 'featured' as const, page: 1, max: '' }

function LaunchSignup() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setFeedback('Informe um e-mail válido.'); return }
    let saved: string[] = []
    try {
      const stored = JSON.parse(localStorage.getItem('kurio.launch-emails') ?? '[]') as unknown
      if (Array.isArray(stored)) saved = stored.filter((value): value is string => typeof value === 'string')
    } catch { localStorage.removeItem('kurio.launch-emails') }
    if (saved.includes(normalized)) { setFeedback('Este e-mail já está cadastrado neste navegador.'); return }
    localStorage.setItem('kurio.launch-emails', JSON.stringify([...saved, normalized]))
    setEmail('')
    setFeedback('E-mail salvo neste navegador.')
  }

  return <div className="launch-signup"><h2>Antecipe-se ao próximo<br/>lançamento</h2><form onSubmit={submit} noValidate><label className="sr-only" htmlFor="launch-email">Seu e-mail</label><input id="launch-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFeedback('') }} placeholder="digite seu e-mail..."/><button>Enviar</button></form><p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>{feedback && <span role="status" className="signup-feedback">{feedback}</span>}</div>
}

export function SiteFooter() {
  return <footer className="site-footer">
    <section className="container trust-strip" id="criadores">
      <article><ShieldCheck/><div><h2>Segurança da carteira</h2><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></div></article>
      <article><Sparkles/><div><h2>Criadores em destaque</h2><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p></div></article>
      <article><BellRing/><div><h2>Alertas de lançamentos</h2><p>Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p></div></article>
      <LaunchSignup/>
    </section>
    <div className="footer-band"><div className="container"><strong>KURIO</strong><span>Feito para colecionadores,<br/>criadores e cultura</span><a href="mailto:contato@email.com">contato@email.com</a><a href="tel:+551140028922">+55 11 4002 8922</a></div></div>
    <div className="container footer-links">
      <nav><h2>Meu perfil</h2><Link to="/profile">Meu perfil</Link><Link to="/favorites">Minha coleção</Link><Link to="/orders">Atividade</Link><span>Estúdio do criador</span><span>Lista de interesse</span></nav>
      <nav><h2>Central de ajuda</h2><span>Central de ajuda</span><span>Como comprar NFTs</span><span>Carteira e segurança</span><span>Política do mercado</span><span>Denunciar item</span></nav>
      <nav><h2>Coleções</h2><Link to="/" search={{ ...homeSearch, category: 'Art' }}>Arte digital</Link><Link to="/" search={{ ...homeSearch, category: 'Photography' }}>Fotografia</Link><Link to="/" search={{ ...homeSearch, category: 'Gaming' }}>Música</Link><Link to="/" search={{ ...homeSearch, category: 'Collectibles' }}>Arte 3D</Link><span>Utilidade</span></nav>
      <div className="footer-social"><h2>Redes sociais</h2><div aria-label="Redes sociais"><Instagram/><Facebook/><Twitter/><Linkedin/><Youtube/></div><h2>Carteiras compatíveis</h2><p>METAMASK · WALLETCONNECT · COINBASE</p></div>
    </div>
    <p className="footer-copyright">© 2026 Kurio. Propriedade digital para todos.</p>
  </footer>
}
