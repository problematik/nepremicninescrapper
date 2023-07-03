/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('ad_configs', t => {
    t.bigIncrements('id', { primaryKey: true })
    t.bigInteger('ad_searcher_id').notNullable()
    t.text('link').notNullable()
    t.string('distance_from').nullable()
    t.integer('max_distance').nullable()

    t.foreign('ad_searcher_id').references('ad_searchers.id')
  })  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('ad_configs')  
};
