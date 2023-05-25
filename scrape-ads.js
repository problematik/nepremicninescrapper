import { getPage, killCookieConsent, checkIfBlocked } from './browser'
import { AdContents, AdErrors, Ads } from './db'
import { sendToSlack } from './notify'

/**
 * @param {import('./db').Ad} ad 
 */
export async function scrapeAd(ad) {
  console.log('Scraping ad', ad.link)
  console.log('Get page')
  const page = await getPage(false)
  console.log('Navigating to page')
  await page.goto(ad.link)

  console.log('Killing cookie consent')
  await killCookieConsent(page)

  await checkIfBlocked()

  console.log('Saving to db')
  await AdContents().insert({
    ad_id: ad.id,
    html_contents: await page.content(),
  })

  console.log('Closing page')
  await page.close()
  console.log('Done')
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
    console.log('No ads to scrape found')
    return 
  }

  console.log('Found ads to scrape', ads.length)
  for(let i = 0; i < ads.length; i++) {
    console.log('Doing ad', i +1, 'of', ads.length)
    const ad = ads[i]
    await scrapeAd(ad)
      .catch(handleAdScrapeError.bind(null, ad))
  }
}

async function handleAdScrapeError(ad, err) {
  console.error(err)
  const existing = await AdErrors()
    .where({ ad_id: ad.id, type: 'scrape' })
    .first()

  if(existing) {
    console.log('Skipping ad scrape error notification')
    return  
  }

  await sendToSlack(process.env.SLACK_CHANNEL, `Ad scrape error ${err.message}`, undefined, ':hammer_and_wrench:')
  await AdErrors().insert({ ad_id: ad.id, type: 'scrape' })
}
