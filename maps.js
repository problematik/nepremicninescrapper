import { Client } from '@googlemaps/google-maps-services-js'
import { Places } from './db'
import get from 'lodash/get'
import { logtail } from './utils/log'

const client = new Client({})

export async function getDistance(place) {
  const [targetPlace, home] = await Promise.all([
    findPlace(place),
    findPlace(process.env.HOME_ADDRESS)
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
    logtail.error(err)
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
    logtail.error(err)
    throw new Error('failed to find place')
  })

  const contents = get(results, 'data.results[0]', false)
  if(!contents) {
    logtail.info(JSON.stringify(results.data))
    logtail.error('Found place but not correct data returned?')
    throw new Error('Unable to parse received data')
  }

  return Places().insert({
    contents,
    name: place
  }).returning('*').then(rows => rows[0])
}
