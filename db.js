import knexfile from './knexfile'
import knexInit from 'knex'
import isObject from 'lodash/isObject'

const env = process.env.NODE_ENV || 'development'

function handleRow(row) {
  if(row && row.hasOwnProperty('contents') && !isObject(row.contents)) {
    row.contents = JSON.parse(row.contents)
  }

  return row
}

/**
 * @type {import('knex').Knex}
 */
export const knex = knexInit({
  ...knexfile[env],
  postProcessResponse: function (result, queryContext) {
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
 * @property {Object} contents
 *
 * @returns {import('knex').Knex.QueryBuilder<AdContent ,AdContent | AdContent[]}>}
 */
export const AddContents = () => knex('ad_contents')

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
