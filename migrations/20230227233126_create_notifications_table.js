/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTableIfNotExists('notifications', t => {
      t.bigIncrements('id', { primaryKey: true })

      t.bigInteger('ad_id').notNullable()
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())

      t.foreign('ad_id').references('ads.id')
    }) 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('notifications')  
};
