import { expect, test, type Page } from '@playwright/test'

async function reset(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => {
    await fetch('/api/demo/reset', { method: 'POST' })
    localStorage.removeItem('kurio.session.token')
    sessionStorage.clear()
  })
}

async function login(page: Page, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill('alex@example.com')
  await dialog.getByLabel('Senha').fill('demo12345')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${redirect.replace('/', '\\/')}$`))
}

test.beforeEach(async ({ page }) => reset(page))

test('catalog search, filters and history live in the URL', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') await page.getByLabel('Explorar coleções').fill('Violet')
  else await page.getByLabel('Buscar na coleção').fill('Violet')
  await expect(page).toHaveURL(/q=Violet/)
  await expect(page.getByText('Violet Nomad #314', { exact: true })).toBeVisible()
  if (testInfo.project.name === 'mobile-chromium') await page.getByRole('button', { name: 'Abrir filtros' }).click()
  await page.getByRole('button', { name: /Avatares/ }).click()
  await expect(page).toHaveURL(/category=Collectibles/)
  if (testInfo.project.name === 'mobile-chromium') await page.getByRole('button', { name: 'Abrir filtros' }).click()
  await page.getByLabel('Preço máximo').selectOption('2')
  await expect(page).toHaveURL(/max=(2|%222%22)/)
  await page.getByRole('button', { name: /Todas as coleções/ }).click()
  if (testInfo.project.name === 'desktop-chromium') {
    await page.getByLabel('Ordenar NFTs').selectOption('price-desc')
    await expect(page).toHaveURL(/sort=price-desc/)
    await page.goBack()
    await expect(page).toHaveURL(/category=All/)
    await expect(page.getByLabel('Ordenar NFTs')).toHaveValue('featured')
  } else {
    await page.goBack()
    await expect(page).toHaveURL(/category=Collectibles/)
  }
})

test('direct detail and missing NFT states', async ({ page }) => {
  await page.goto('/nft/nft-2')
  await expect(page.getByRole('heading', { name: 'Violet Nomad #314' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'COMPRAR' })).toBeEnabled()
  await page.goto('/nft/not-found')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('guest cart survives login and coupon updates quote', async ({ page }) => {
  await page.goto('/nft/nft-1')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('Emerald Ape #042', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Código promocional aplicado.')).toBeVisible()
  await page.getByRole('button', { name: /Conectar e finalizar/ }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('dialog')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill('alex@example.com')
  await dialog.getByLabel('Senha').fill('demo12345')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.goto('/cart')
  await expect(page.locator('.cart-line').getByText('Emerald Ape #042', { exact: true })).toBeVisible()
})

test('home editorial sections, footer and launch signup are functional', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Segurança da carteira' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Criadores em destaque' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alertas de lançamentos' })).toBeVisible()
  await page.getByLabel('Seu e-mail').fill('invalido')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await page.getByLabel('Seu e-mail').fill('colecionador@kurio.test')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('E-mail salvo neste navegador.')).toBeVisible()
})

test('authentication opens as a modal without leaving the current NFT', async ({ page }) => {
  await page.goto('/nft/nft-2')
  await page.getByRole('button', { name: /Favoritar NFT|Favoritar Violet/ }).first().click()
  await expect(page).toHaveURL(/\/nft\/nft-2$/)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('tab', { name: 'Criar conta' }).click()
  await expect(dialog.getByRole('heading', { name: 'Criar perfil de colecionador' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('confirmed checkout is idempotent and clears purchased cart lines', async ({ page }) => {
  await page.goto('/nft/nft-2')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await login(page, '/checkout')
  await page.getByRole('button', { name: /MetaMask/ }).click()
  await page.getByRole('button', { name: 'Revisar compra' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\//)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 8_000 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
})

test('home, detail, cart and checkout visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  await page.goto('/nft/nft-1')
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
  await login(page, '/checkout')
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
})
