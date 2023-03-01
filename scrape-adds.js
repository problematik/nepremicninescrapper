import { getPage, killCookieConsent } from './browser'
import { AdContents, Ads } from './db'

/**
 * @param {import('./db').Ad} ad 
 */
export async function scrapeAd(ad) {
  console.log('Scraping ad', ad.link)
  const page = await getPage(false)
  await page.goto(ad.link)

  await killCookieConsent(page)

  console.log('Saving to db')
  await AdContents().insert({
    ad_id: ad.id,
    html_contents: await page.content(),
  })

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
    console.log('Doing add', i +1, 'of', ads.length)
    const ad = ads[i]
    await scrapeAd(ad)
  }
}
