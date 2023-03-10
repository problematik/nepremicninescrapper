import axios from 'axios'
import { AdContents, AdErrors, Ads, knex, Notifications } from './db'
import { parse } from './parse'

export async function adToSlack(ad, contents) {
  const { distance, m2, images, shortDescription, price, type, seller, place } = contents

  const attachments = [
    {
      "mrkdwn_in": ["text"],
        "color": "#36a64f",
        "pretext": shortDescription,
        "author_name": type,
        "author_link": ad.link,
        "author_icon": images.length ? images[0] : undefined,
        "title": "POVEZAVA",
        "title_link": ad.link,
        // "text": "Optional `text` that appears within the attachment",
        "fields": [
            {
                "title": `Cena ${price.type === 'month' ? '(na mesec)' : ''}`,
                "value": price.price,
                "short": true
            },
            {
                "title": "Kvadratura",
                "value": m2,
                "short": true
            },
            {
              "title": "Kraj",
              "value": place,
              "short": true
            },
            {
                "title": "Oddaljenost od Kamnika",
                "value": distance,
                "short": true
            },
            {
              "title": "Tip",
              "value": type === 'private' ? 'Zasebna' : 'Agencija',
              "short": true
            },
            images.length ? {
              "title": "Število vseh slik",
              "value": images.length,
              "short": true
            }
            : undefined
        ].filter(v => v),
        "thumb_url": images[1] || undefined
    }
  ]

  return sendToSlack(process.env.SLACK_CHANNEL, 'Nov Oglas' , attachments)
}

export async function sendToSlack(channel, text, attachments, emoji = ':sleuth_or_spy:') {
  const payload = {
    channel: process.env.SLACK_CHANNEL,
    username: 'Sistem Objavljalček',
    text,
    type: 'plain_text',
    icon_emoji: emoji,
    attachments
  }

  console.log('Sending slack notification')

  return axios.post(
    process.env.SLACK_WEBHOOK,
    payload
  ).catch(err => {
    console.log('Unable to send slack notification')
    console.error(err)
  })
}

function getPendingAds() {
  return AdContents()
    .select('ad_contents.*')
    .leftJoin('notifications', 'notifications.ad_id', 'ad_contents.ad_id')
    .whereNull('notifications.id')
}
export async function notify() {
  const adContents = await getPendingAds()

  if(!adContents.length) {
    console.log('No ads to fetch')
    return
  }

  for(let i = 0; i < adContents.length; i++) {
    const adContent = adContents[i]
    const ad = await Ads().where({id: adContent.ad_id}).first()
    const contents = await parse(ad, adContent)
      .catch(handleAdParseError.bind(null, ad))
    if(!contents) continue
    
    

    await adToSlack(ad, contents)
    await markNotified(ad)
  }
}

async function handleAdParseError(ad, err) {
  console.error('Failed to parse ad')
  console.error(err)

  const alreadyNotified = await AdErrors()
    .where({ ad_id: ad.id, type: 'parse' })
    .first()

  if(!alreadyNotified) {
    await sendToSlack(process.env.SLACK_CHANNEL, `Failed to parse error ${err.message}`, undefined, ':hammer_and_wrench:')
    await AdErrors().insert({ ad_id: ad.id, type: 'parse' })
  }

  return false
}

export async function markNotified(ad) {
  return Notifications().insert({
    ad_id: ad.id
  })
}


export async function markAllNotified() {
  const ads = await Ads()
    .select('ads.id')
    .leftJoin('notifications', 'notifications.ad_id', 'ads.id')
    .whereNull('notifications.id')

  const adIds = ads.map(ad => ({ ad_id: ad.id }))
  console.log('Updating ads as seen', adIds.length)

  if(!adIds.length) return
  return knex.batchInsert('notifications',  adIds)
}
