/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.createTableIfNotExists('ad_searchers', t => {
    t.bigIncrements('id', { primaryKey: true })
    t.string('searcher').notNullable()
    t.string('slack_channel').nullable()
    t.string('slack_color').nullable()
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('ad_searchers')
};
