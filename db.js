import knexfile from './knexfile'
import knexInit from 'knex'
import isObject from 'lodash/isObject'

const env = process.env.NODE_ENV || 'development'

function handleRow(row) {
  const properties = ['contents', 'distance']
  if(!row || !isObject(row)) {
    return row
  }

  for(const property of properties) {
    if(Object.prototype.hasOwnProperty.call(row, property) && !isObject(row[property])) {
      row[property] = JSON.parse(row[property])
    }
  }

  return row
}

/**
 * @type {import('knex').Knex}
 */
export const knex = knexInit({
  ...knexfile[env],
  postProcessResponse: function (result) {
    if(Array.isArray(result)) {
      return result.map(handleRow)
    }

    return handleRow(result)
  }
})

/**
 * @typedef {Object} Ad
 * @property {number} id
 * @property {string} link
 * @property {Date} created_at
 *
 * @returns {import('knex').Knex.QueryBuilder<Ad, Ad | Ad[]>}
 */
export const Ads = () => knex('ads')

/**
 * @typedef {Object} Notification
 * @property {number} id
 * @property {number} ad_id
 * @property {Date} created_at
 *
 * @returns {import('knex').Knex.QueryBuilder<Notification, Notification | Notification[]>}
 */
export const Notifications = () => knex('notifications')

/**
 * @typedef {Object} AdContent
 * @property {number} id
 * @property {number} ad_id
 * @property {string} html_contents
 *
 * @returns {import('knex').Knex.QueryBuilder<AdContent ,AdContent | AdContent[]}>}
 */
export const AdContents = () => knex('ad_contents')

/**
 * @typedef {Object} Place
 * @property {number} id
 * @property {string} name
 * @property {import('@googlemaps/google-maps-services-js').Place} contents
 * @property {import('@googlemaps/google-maps-services-js').Distance} distance
 * @property {Date} created_at
 *
 * @returns {import('knex').Knex.QueryBuilder<Place ,Place | Place[]}>}
 */
export const Places = () => knex('places')

/**
 * @typedef {Object} AdError
 * @property {number} id
 * @property {number} ad_id
 * @property {'scrape'|'parse'} type
 *
 * @returns {import('knex').Knex.QueryBuilder<AdError ,AdError | AdError[]}>}
 */
export const AdErrors = () => knex('ad_errors')
