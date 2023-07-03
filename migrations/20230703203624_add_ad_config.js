/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.createTableIfNotExists('ad_config', t => {
    t.bigInteger('ad_id').notNullable()
    t.bigInteger('ad_config_id').notNullable()

    t.foreign('ad_id').references('ads.id')
    t.foreign('ad_config_id').references('ad_configs.id')
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('ad_config')
};
