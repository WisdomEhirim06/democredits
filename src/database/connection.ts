import knex, { Knex } from 'knex';
import config from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const knexConfig: Knex.Config = config[environment];

const db: Knex = knex(knexConfig);

export default db;
