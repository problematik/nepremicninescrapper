/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
    return knex.schema.createTable('ad_errors', t => {
      t.bigIncrements('id', { primaryKey: true })
      t.bigInteger('ad_id').notNullable()
      t.string('type', 10).notNullable()

      t.foreign('ad_id').references('ads.id')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('ad_errors')
};
