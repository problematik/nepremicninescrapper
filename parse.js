import { getPage } from "./browser"
import { getDistance } from "./maps"
import { markNotified } from "./notify"
import { logtail } from './utils/log'

/**
 * 
 * @param {import('./db').Ad} ad 
 * @param {import('./db').AdContent} adContents 
 */
export async function parse(ad, adContents) {
  logtail.log('Handling', ad.id, ad.link)
  const page = await getPage(false)
  await page.setContent(adContents.html_contents)

  const stillActive = await isStillActive()
  if(!stillActive) {
    logtail.log('Ad no longer active')
    await markNotified(ad)
    await page.close()
    return false
  }

  const content = await extractInfo()
  await page.close()

  return content

  async function isStillActive() {
    const $el = await page.waitForSelector('#vsebina760', { timeout: 10000}).catch(() => false)
    if(!$el) return true
    const $p = await $el.evaluate(el => el.querySelector('p').textContent)
    return $p !== 'Oglas ni več aktiven.'
  }

  async function extractInfo() {
    const $more_info = await page.waitForSelector('.more_info', { timeout: 10000 })
    const moreInfo = await $more_info.evaluate(el => el.textContent)

    const place = extractPlace(moreInfo)
    const type = extractType()
    const [distance, m2, images, shortDescription, price, seller] = await Promise.all([
      getDistance(place),
      extractM2(),
      extractImagesPaths(),
      extractShortDescription(),
      extractPrice(),
      extractSeller()
    ]) 

    return {
      place,
      distance,
      m2,
      images,
      shortDescription,
      price,
      type,
      seller
    }

    async function extractSeller() {
      const $wrapper = await page.waitForSelector('.wrapper-prodajalec > .prodajalec')
      const contents = $wrapper.evaluate(el => el.textContent)
      return contents === 'ZASEBNA PONUDBA' ? 'private' : 'agency'
    }

    async function extractShortDescription() {
      const $description = await page.waitForSelector('#opis .kratek')
      return $description.evaluate(el => el.textContent)
    }

    async function extractImagesPaths() {
      const $gallery = await page.waitForSelector('#galerija .rsThumbsContainer', { timeout: 10000 })
      const childImages = await $gallery.evaluate(el => Array.from(el.children).map(el => el.querySelector('img').src))
      if(childImages.length === 0) {
        throw new Error('Images not found')
      }

      const images = []
      for(const image of childImages) {
        const isNoImagePlaceholder = image.match(/n-1.jpg$/)
        if(isNoImagePlaceholder) continue

        images.push(image)
      }

      return images.filter(v => v)
    }

    function extractPlace() {
      const obcina = moreInfo.match(/Ob.ina: (.*)$/)
      if(obcina) {
        return obcina[1]
      }
    
      const upravnaEnota = moreInfo.match(/Upravna enota: (.*)( \||$)/)
      if(upravnaEnota) {
        return upravnaEnota[1]
      }
    
      throw new Error(`Unable to find place for ${moreInfo}`)
    }

    function extractType() {
      const typeMatch = moreInfo.match(/Vrsta: (.*?) \|/)
      if(!typeMatch) {
        throw new Error('Unable to find type match')
      }

      let [, type] = typeMatch

      return type.trim()
    }

    async function extractM2() {
      let $attribute = await page.waitForSelector('#atributi #icon-33', { timeout: 10000 }).catch(() => false)
      if($attribute) {
        const m2 = await $attribute.evaluate(el => el.nextSibling.textContent)
        const m2Match = m2.match(/Velikost: (.*?) m/)
        if(!m2Match) {
          throw new Error('M2 attribute exists but unable to extract value')
        }
        const [, m2Value] = m2Match
        return Number.parseFloat(m2Value.trim(), 10)
      }

      const shortDescription = await extractShortDescription()
      const m2Match = shortDescription.match(/(\d+,\d+) m2|(\d+) m2/)
      if(m2Match) {
        const [, first, second] = m2Match
        const value = [first, second].filter(v => v)[0]
        if(value) {
          return Number.parseFloat(value.trim(), 10)
        }
      }

      throw new Error('Unable to extract m2')
    }
  }
  async function extractPrice() {
    const $price = await page.waitForSelector('.cena', { timeout: 10000 })
    let price = await $price.evaluate(el => el.textContent)
    price = price.trim()
    
    const eurosMatch = price.match(/(?<price>(\d+.)?\d+(,\d+)?) €/)
    if(!eurosMatch) {
      throw new Error('Unable to parse euros from price')
    }
    
    let euros = eurosMatch.groups.price
    euros = Number.parseFloat(euros.replace(/\./g, ''), 10)

    const perMonthMatch = price.match(/€\/mesec/)
    if(perMonthMatch) {
      return {
        price: euros,
        type: 'month'
      }
    }

    throw new Error('non month price')
  }
}
