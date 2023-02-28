/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTableIfNotExists('ads', table => {
    table.bigIncrements('id', { primaryKey: true })

    table.string('link', 500).notNullable().unique()

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('ads')
};
