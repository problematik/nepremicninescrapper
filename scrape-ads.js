import { getPage, killCookieConsent, checkIfBlocked, optimizeNavigation } from './browser'
import { AdContents, AdErrors, Ads } from './db'
import { sendToSlack } from './notify'
import { logtail } from './utils/log'

/**
 * @param {import('./db').Ad} ad 
 */
export async function scrapeAd(ad) {
  logtail.info('Scraping ad', {
    link: ad.link
  })
  logtail.info('Get page')
  const page = await getPage(false)
  logtail.info('Navigating to page')
  await optimizeNavigation(page, ad.link)

  logtail.info('Killing cookie consent')
  await killCookieConsent(page)

  await checkIfBlocked(page)

  logtail.info('Saving to db')
  await AdContents().insert({
    ad_id: ad.id,
    html_contents: await page.content(),
  })

  logtail.info('Closing page')
  await page.close()
  logtail.info('Done')
}

export async function scrape() {
  const ads = await Ads()
  .select('ads.*')
  .leftJoin('ad_contents', function(join) {
    join.on('ads.id', 'ad_contents.ad_id')
  })
  .whereNull('ad_contents.id')
  // skip all ready marked as seen ads
  .leftJoin('notifications', 'ads.id', 'notifications.id')
  .whereNull('notifications.id')

  if(!ads.length) {
    logtail.info('No ads to scrape found')
    return 
  }

  logtail.info(`Found ads to scrape: ${ads.length}`)
  for(let i = 0; i < ads.length; i++) {
    logtail.info(`Doing ad ${i +1} of ${ads.length}`)
    const ad = ads[i]
    await scrapeAd(ad)
      .catch(handleAdScrapeError.bind(null, ad))
  }
}

async function handleAdScrapeError(ad, err) {
  logtail.error(err)
  const existing = await AdErrors()
    .where({ ad_id: ad.id, type: 'scrape' })
    .first()

  if(existing) {
    logtail.info('Skipping ad scrape error notification')
    return  
  }

  await sendToSlack(process.env.SLACK_CHANNEL, `Ad scrape error ${err.message}`, undefined, ':hammer_and_wrench:')
  await AdErrors().insert({ ad_id: ad.id, type: 'scrape' })
}
