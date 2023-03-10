import { executablePath } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import pluginStealth from 'puppeteer-extra-plugin-stealth'
import adBlocker from 'puppeteer-extra-plugin-adblocker'

puppeteer.use(pluginStealth())
puppeteer.use(adBlocker({
  blockTrackers: true,
  blockTrackersAndAnnoyances: true,
}))

/**
 * @type {import('puppeteer').Browser}
 */
let browser

export async function killBrowser() {
  if(!browser) return

  await browser.close()
}

/**
 * 
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function getBrowser() {
  if(browser) return browser

  const args = process.env.RENDER
    ? ['--no-sandbox', '--disable-setuid-sandbox']
    : []

  return new Promise(resolve => {
    puppeteer.launch({headless: true, executablePath: executablePath(), args }).then(async browser => {
      resolve(browser)
    })
  })
}

/**
 * @returns {Promise<import('puppeteer').Page>}
 */
export async function getPage(randomWait = true) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  
  if(process.env.RENDER) {
    page.setDefaultNavigationTimeout(60 * 1000)
  }

  if(randomWait) {
    await page.waitForTimeout((Math.floor(Math.random() * 12) + 5) * 1000) 
  }
  
  await page.setViewport({width: 1280, height: 720})
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36')
  await page.setExtraHTTPHeaders({ 
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36', 
    'upgrade-insecure-requests': '1', 
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8', 
    'accept-encoding': 'gzip, deflate, br', 
    'accept-language': 'en-US,en;q=0.9,en;q=0.8' 
  }); 

  await page.setRequestInterception(true); 
  page.on('request', async (request) => { 
    if (request.resourceType() == 'image') { 
      await request.abort(); 
    } else { 
      await request.continue(); 
    } 
  }); 

  return page
}

/**
 * @param {import('puppeteer').Page} page 
 */
export async function killCookieConsent(page) {
  const found = await page.waitForSelector('.CybotCookiebotDialogContentWrapper', { timeout: 5000 }).catch(() => false)
  if(!found) return

  await page.click('#CybotCookiebotDialogBodyButtonDecline')  
}
    

