import { expect, test, type Page } from '@playwright/test'

async function resetAndLogin(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => {
    await fetch('/api/demo/reset', { method: 'POST' })
    localStorage.removeItem('kurio.session.token')
    sessionStorage.clear()
  })
  await page.goto('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill('alex@example.com')
  await dialog.getByLabel('Senha').fill('demo12345')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
}

test.beforeEach(async ({ page }) => resetAndLogin(page))

test('registration validates fields, creates an account and rejects duplicate email', async ({ page }) => {
  await page.evaluate(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('kurio.session.token')
  })
  await page.goto('/register')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nome de usuário').fill('Nova Colecionadora')
  await dialog.getByLabel('E-mail').fill('novo@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill('curta')
  await dialog.getByLabel('Confirmar senha').fill('curta')
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(dialog.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
  await dialog.getByLabel('Senha', { exact: true }).fill('senha-segura')
  await dialog.getByLabel('Confirmar senha').fill('senha-segura')
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('kurio.session.token')))).toBe(true)

  await page.evaluate(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('kurio.session.token')
  })
  await page.goto('/register')
  const duplicate = page.getByRole('dialog')
  await duplicate.getByLabel('Nome de usuário').fill('Alex duplicado')
  await duplicate.getByLabel('E-mail').fill('alex@example.com')
  await duplicate.getByLabel('Senha', { exact: true }).fill('demo12345')
  await duplicate.getByLabel('Confirmar senha').fill('demo12345')
  await duplicate.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(duplicate.getByText('Este e-mail já está cadastrado.')).toBeVisible()
})

test('session expiration reopens authentication and preserves the requested route', async ({ page }) => {
  await page.evaluate(() => fetch('/api/demo/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'session-expired' }) }))
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('logout clears the session and another user can sign in', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio.session.token'))).toBeNull()
  await page.goto('/login?redirect=%2Fprofile')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill('sam@example.com')
  await dialog.getByLabel('Senha').fill('demo12345')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByLabel('Nome de exibição*')).toHaveValue('Sam Rivera')
})

test('favorite optimistic update rolls back on API failure', async ({ page }) => {
  await page.goto('/nft/nft-2')
  await page.waitForTimeout(750)
  await page.evaluate(() => fetch('/api/demo/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'favorite-fail' }) }))
  const favorite = page.locator('.favorite-text:visible, .mobile-favorite:visible')
  await favorite.click()
  await expect(page.getByText(/A alteração foi desfeita/)).toBeVisible()
  await expect(favorite).toBeVisible()
})

test('profile validation and wallet conflict are surfaced', async ({ page }) => {
  await page.goto('/profile')
  await page.getByLabel('Nome de exibição*').fill('A')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Informe nome e e-mail válidos.')).toBeVisible()
  await page.goto('/wallets')
  await page.getByRole('button', { name: 'Adicionar carteira' }).click()
  await page.getByLabel('Apelido da carteira*').fill('Invalid')
  await page.getByLabel('Endereço da carteira*').fill('0x123')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText(/endereço 0x com 40 caracteres/).last()).toBeVisible()
})

test('live NFT change reaches the client through Socket.IO', async ({ page }) => {
  await page.goto('/nft/nft-1')
  await page.waitForFunction(() => document.documentElement.dataset.realtime === 'connected')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.waitForFunction(() => document.documentElement.dataset.realtime === 'connected')
  await page.evaluate(() => fetch('/api/demo/nft-change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId: 'nft-1', priceEth: '0.900000' }) }))
  await expect(page.getByText(/preço ou a disponibilidade atualizados/)).toBeVisible({ timeout: 6_000 })
  await expect(page.locator('.cart-line .price:visible').filter({ hasText: '0.90 ETH' }).first()).toBeVisible()
})

test('slow scenario exposes skeletons and can recover', async ({ page }) => {
  await page.evaluate(() => fetch('/api/demo/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'slow' }) }))
  await page.reload()
  await expect(page.locator('.skeleton').first()).toBeVisible()
  await expect(page.getByText('Emerald Ape #042', { exact: true })).toBeVisible({ timeout: 8_000 })
})
