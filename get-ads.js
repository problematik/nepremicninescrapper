import { getPage, killCookieConsent, checkIfBlocked } from './browser'
import { Ads, knex } from './db'
import difference from 'lodash/difference'
import { sendToSlack } from './notify'
import { logtail } from './utils/log'

/**
 *
 * @param {import('puppeteer').Page} page
 */
async function getNumberOfTotalPages(page) {
  logtail.info('Searching for last page indicator')
  let lastPage = await page
    .waitForSelector('.paging_last > a', { timeout: 10000 })
    .catch(() => false)

  let pages = 1
  if(!lastPage) {
    logtail.info('Selector not found. Assuming no pages')
    return pages
  }
  const pageContent = await lastPage.evaluate(el => el.href)
  const matches = pageContent.match(/(\/(\d+)$|(\d+)\/\?s=16$)/)
  if(!matches) {
    logtail.info('Selector found but no matches found')
    return pages
  }

  const [ , , val, val2] = matches
  const value = [val, val2].filter(v => v)
  if(!value) {
    logtail.info('Matches found but no value found')
    return pages
  }

  const lastPageNumber = Number.parseInt(value, 10)
  logtail.info('Last page content', lastPageNumber)
  return lastPageNumber
}

/**
 *
 * @param {import('puppeteer').Page} page
 */
async function extractUrls(page) {
  logtail.info('Searching for ads', { url: page.url()})
  const links = await getAdLinks()
  if(!links.length) {
    logtail.info('No links found on page')
    return false
  }
  const existingAdLinks = await Ads().whereIn('link', links)
    .then(ads => ads.map(ad => ad.link))

  const newLinks = difference(links, existingAdLinks)
  if(!newLinks.length) {
    logtail.info('No new links found')
    return false
  }

  const rows = newLinks.reduce((memo, link) => {
    memo.push({
      link
    })
    return memo
  }, [])

  logtail.info('Inserting ads', { num: rows.length })
  await knex.batchInsert('ads', rows, 100)

  return true

  async function getAdLinks() {
    const ads1 = await page.$$('div[itemprop=item] > .property-image > a:first-child')
    const links1 = await Promise.all(ads1.map(ad => ad.evaluate(el => el.href)))
    if(links1.length) return links1
    const ads2 = await page.$$('div[itemprop=item] > .property-details')
    const links2 = await Promise.all(ads2.map(ad => ad.evaluate(el => el.dataset['href'])))
    if(links2.length) return links2
    const ads3 = await page.$$('div[itemprop=item] > .property-details > a:first-child')
    return Promise.all(ads3.map(ad => ad.evaluate(el => el.href)))
  }
}

async function evaluatePage(urlGenerator) {
  const url = urlGenerator(false)

  logtail.info('Starting url', { url })
  const page = await getPage()

  await advance(url)

  const pages = await getNumberOfTotalPages(page)

  logtail.info('In total there are', pages, 'page/s')

  for(let currentPage = 1; currentPage <= pages; currentPage++) {
    const nextPage = await extractUrls(page)
      .catch(async err => {
        logtail.error('Failed to extract urls')
        logtail.error(err)
        await sendToSlack(process.env.SLACK_CHANNEL, `Error encountered ${err.message}`, undefined, ':firecracker:')

        throw err
      })
    if(!nextPage) break;

    if(currentPage < pages) {
      await new Promise(resolve => setTimeout(resolve, 10000))

      await advance(urlGenerator(currentPage + 1))
    }
  }

  logtail.info('Finished with', { url })

  await page.close()

  async function advance(url) {
    logtail.info('Navigating to URL')
    await page.goto(url)

    logtail.info('Killing cookie consent')
    await killCookieConsent(page)

    await checkIfBlocked(page)
  }
}

export async function scrape() {
  await evaluatePage((nextPage) => {
    if(!nextPage) return 'https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/stanovanje/?s=16#'
    return `https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/stanovanje/${nextPage}/?s=16#`
  })
  await evaluatePage((nextPage) => {
    if(!nextPage) return 'https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/hisa/?s=16'
    return `https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/hisa/${nextPage}/?s=16`
  })
  await evaluatePage((nextPage) => {
    if(!nextPage) return 'https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/vikend/?s=16'
    return `https://www.nepremicnine.net/oglasi-oddaja/ljubljana-okolica/vikend/${nextPage}/?s=16`
  })
}
