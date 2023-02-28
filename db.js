import knexfile from './knexfile'
import knexInit from 'knex'
const env = process.env.NODE_ENV || 'development'

/**
 * @type {import('knex').Knex}
 */
export const knex = knexInit(knexfile[env])

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
