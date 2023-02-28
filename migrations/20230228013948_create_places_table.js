/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTableIfNotExists('places', t => {
    t.bigIncrements('id', { primaryKey: true })
    t.string('name', 500).notNullable().unique()
    t.jsonb('contents').notNullable()
    t.jsonb('distance')
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
    return knex.schema.dropTableIfExists('places')
};
