require('dotenv').config();
const pg = require('pg');
const Client = pg.Client;
const client = new Client(process.env.DATABASE_URL);
module.exports = client;
