// load connection string from .env
require('dotenv').config();
// "require" pg (after `npm i pg`)
const pg = require('pg');
// Use the pg Client
const Client = pg.Client;
// **note:** you will need to create the database!

// async/await needs to run in a function
run();

async function run() {
    // make a new pg client to the supplied url
    const client = new Client(process.env.DATABASE_URL);

    try {
        // initiate connecting to db
        await client.connect();

        // run a query to create tables
        await client.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(256) NOT NULL,
                    hash VARCHAR(512) NOT NULL,
                    display_name VARCHAR(256) NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE
                );           
                CREATE TABLE air_listings (
                    id SERIAL PRIMARY KEY NOT NULL,
                    program_name VARCHAR(256),
                    address VARCHAR(256),
                    city VARCHAR(256),
                    state VARCHAR(2),
                    zip_code VARCHAR(256),
                    country VARCHAR(256),
                    continent VARCHAR(256),
                    phone_num VARCHAR(20), 
                    email VARCHAR(256),
                    art_medium VARCHAR(256),
                    img_url VARCHAR(600),
                    link_url VARCHAR(600),
                    description VARCHAR(256),
                    user_id INTEGER,
                    is_grant BOOLEAN,
                    lat VARCHAR(256),
                    long VARCHAR(256)
            );
                CREATE TABLE favorites (
                    id SERIAL PRIMARY KEY NOT NULL,
                    program_name VARCHAR(256),
                    address VARCHAR(256),
                    city VARCHAR(256),
                    state VARCHAR(2),
                    zip_code INTEGER,
                    country VARCHAR(256),
                    continent VARCHAR(256),
                    phone_num VARCHAR(20), 
                    email VARCHAR(256),
                    art_medium VARCHAR(256),
                    img_url VARCHAR(600),
                    link_url VARCHAR(600),
                    description VARCHAR(256),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    is_grant BOOLEAN,
                    lat VARCHAR(256),
                    long VARCHAR(256),
                    unique (user_id, program_name)
            );
        `);

        console.log('create tables complete');
    }
    catch (err) {
        // problem? let's see the error...
        console.log(err);
    }
    finally {
        // success or failure, need to close the db connection
        client.end();
    }

}