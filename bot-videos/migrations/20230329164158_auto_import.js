exports.up = function(knex, Promise){
    return knex.schema.createTable('auto_import', table => {
        table.increments('id').primary()
        table.dateTime('created_at')
           .notNullable()
           .defaultTo(knex.raw('CURRENT_TIMESTAMP'))
        table.dateTime('updated_at')
           .notNullable()
           .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
        table.string('url')
        table.string('email')
        table.integer('user_id')
        table.string('platform')
    }).then( result =>console.log(result))
    .catch(err=>console.log(err))
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('auto_import');
  };