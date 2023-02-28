import { Client } from '@googlemaps/google-maps-services-js'
import { Places } from './db'
import get from 'lodash/get'

const client = new Client({})

function extractPlace(placeText) {
  const obcina = placeText.match(/Ob.ina: (.*)$/)
  if(obcina) {
    return obcina[1]
  }

  const upravnaEnota = placeText.match(/Upravna enota: (.*)( \||$)/)
  if(upravnaEnota) {
    return upravnaEnota[1]
  }

  throw new Error(`Unable to find place for ${placeText}`)
}

export async function getDistance(placeText) {
  const place = extractPlace(placeText)
  const [targetPlace, home] = await Promise.all([
    findPlace(place),
    findPlace('Ljubljana')
  ])

  const distance = await findDistance(targetPlace, home)
  return get(distance, 'rows.0.elements.0.distance.text')
}

/**
 *
 * @param {import('./db').Place} place
 * @param {import('./db').Place} home
 */
async function findDistance(place, home) {
  if(place.distance) return place.distance

  const results = await client.distancematrix({
    params: {
      origins:[`place_id:${home.contents.place_id}`],
      destinations:[`place_id:${place.contents.place_id}`],
      units: 'meters',
      key: process.env.GOOGLE_MAPS_KEY
    }
  })
  .catch(err => {
    console.error(err)
    throw new Error('failed to find distance')
  })

  await Places().update({distance: JSON.stringify(results.data) }).where({ id: place.id })

  return results.data
}
/**
 * @param {string} place
 * @returns {Promise<import('@googlemaps/google-maps-services-js').Place>}
 */
async function findPlace(place) {
  const existingPlace = await Places().where({name: place}).first()
  if(existingPlace) return existingPlace

  const results = await client.textSearch({
    params: {
      query: `${place}, Slovenia`,
      key: process.env.GOOGLE_MAPS_KEY
    }
  })
  .catch(err => {
    console.error(err)
    throw new Error('failed to find place')
  })

  const contents = get(results, 'data.results[0]', false)
  if(!contents) {
    console.log(JSON.stringify(results.data))
    console.error('Found place but not correct data returned?')
    throw new Error('Unable to parse received data')
  }

  return Places().insert({
    contents,
    name: place
  }).returning('*').then(rows => rows[0])
}
