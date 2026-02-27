import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('transactions', (table) => {
        table.increments('id').primary();
        table.integer('wallet_id').unsigned().notNullable();
        table.enum('type', ['funding', 'transfer', 'withdrawal']).notNullable();
        table.decimal('amount', 15, 2).notNullable();
        table.string('reference', 255).notNullable().unique();
        table.decimal('balance_before', 15, 2).notNullable();
        table.decimal('balance_after', 15, 2).notNullable();
        table.json('metadata').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        table.foreign('wallet_id').references('id').inTable('wallets').onDelete('CASCADE');
        table.index(['wallet_id', 'created_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('transactions');
}
