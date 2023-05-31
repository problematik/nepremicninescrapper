import { executablePath } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import pluginStealth from 'puppeteer-extra-plugin-stealth'
import adBlocker from 'puppeteer-extra-plugin-adblocker'
import { logtail } from './utils/log'

let proxyList
if(process.env.PROXY_LIST) {
  const list = process.env.PROXY_LIST.split(',')
  proxyList = list.map(entry => {
    const [, host, usernamePassword] = entry.match(/(.*\d+):(.*)$/)
    const [username, password] = usernamePassword.split(':')
    return {
      host,
      username,
      password
    }
  })
}

function proxyRotate() {
  proxyList.push(proxyList.shift());
  return proxyList
}

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
async function newPage() {
  const browser = await getBrowser()
  if(proxyList) {
    logtail.info('newPage - using proxy')
    const proxy = proxyRotate()[0]
    const context = await browser.createIncognitoBrowserContext({ proxyServer: `https://${proxy.host}` })
    const page = await context.newPage()
    await page.authenticate({
      password: proxy.password,
      username: proxy.username
    })

    return page
  }

  logtail.info('newPage - without proxy')
  return browser.newPage()
}

/**
 * @returns {Promise<import('puppeteer').Page>}
 */
export async function getPage(randomWait = true) {
  const page = await newPage()

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

  return page
}

/**
 * @param {import('puppeteer').Page} page
 */
export async function killCookieConsent(page) {
  const found = await page.waitForSelector('.CybotCookiebotDialogContentWrapper', { timeout: 10000 }).catch(() => false)
  if(!found) return

  await page.click('#CybotCookiebotDialogBodyButtonDecline')
}


/**
 *
 * @param {import('puppeteer').Page} page
 */
export async function checkIfBlocked(page) {
  const title = await page.title()
  if(title.indexOf('Cloudflare') !== -1) {
    throwBlocked()
  }

  const blocked = await page
  .waitForSelector('h1.block_headline', { timeout: 10000 })
  .catch(() => false)

  if(blocked) {
    throwBlocked
  }

  function throwBlocked() {
    throw new Error('Blocked!')
  }
}

/**
 *
 * @param {import('puppeteer').Page} page
 * @param {string} url
 */
export async function optimizeNavigation(page, url) {
  let bytes = 0
  const requestCount = new Set()
  const fullRequests = new Map()
  const devTools = await page.target().createCDPSession();

  await devTools.send("Network.enable");

  await devTools.send('Network.setCacheDisabled', {
    cacheDisabled: false
  })

  await devTools.send('Network.setRequestInterception', {
    patterns: [
      { resourceType: 'Stylesheet' },
      { resourceType: 'Font' },
      { resourceType: 'Image' },
      { resourceType: 'Script' },
      { resourceType: 'Media' }
    ]
  })

  devTools.on('Network.requestWillBeSent', event => {
    logtail.debug('Request sending', {
      requestId: event.requestId,
      url: event.request.url
    })

    fullRequests.set(event.requestId, event.request);
    requestCount.add(event.requestId)
  })

  devTools.on('Network.requestIntercepted', async event => {
    logtail.debug('Intercepted request', {
      requestId: event.requestId,
      url: event.request.url
    })

    await devTools.send('Network.continueInterceptedRequest', {
      interceptionId: event.interceptionId,
      errorReason: 'Aborted'
    })
  })

  devTools.on('Network.loadingFailed', event => {
    requestCount.delete(event.requestId)
  })


  devTools.on("Network.loadingFinished", event => {
    bytes+=event.encodedDataLength
    requestCount.delete(event.requestId)
  })


  logtail.debug('Devtools hooks registered - navigating', { url })
  await page.goto(url)
  logtail.debug('Page navigated, waiting for requests')
  await waitForAllResponses()
  logtail.info('Fetched all requests', {
    size: niceBytes(bytes),
    url
  })

  await devTools.detach()

  async function waitForAllResponses(iteration = 0) {
    if(requestCount.size <= 0) return
    logtail.info('Total requests pending', { requests: requestCount.size })

    if(iteration === 5) {
      for(const item of requestCount.keys()) {
        const request = fullRequests.get(item)
        logtail.debug('Waiting for', request.url)
      }
      throw new Error('Max wait time reached')
    }

    await new Promise(resolve => setTimeout(resolve, 5000))
    return waitForAllResponses(iteration + 1)
  }
   
  function niceBytes(x){
    const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

    let l = 0, n = parseInt(x, 10) || 0;

    while(n >= 1024 && ++l){
        n = n/1024;
    }
    
    return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l]);
  }
}
