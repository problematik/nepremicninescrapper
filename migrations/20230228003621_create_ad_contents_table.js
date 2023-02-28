/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTableIfNotExists('ad_contents', t => {
      t.bigIncrements('id', { primaryKey: true })
      t.bigInteger('ad_id').notNullable()
      t.jsonb('contents').notNullable()

      t.foreign('ad_id').references('ads.id')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('ad_contents')
};
