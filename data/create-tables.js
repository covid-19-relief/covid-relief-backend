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
                    hash VARCHAR(512) NOT NULL
                    
                );           
                CREATE TABLE relief_listings (
                    id SERIAL PRIMARY KEY NOT NULL,
                    name_of_fund VARCHAR(256),
                    beneficiaries VARCHAR(256),
                    purpose VARCHAR(2000),
                    administrator VARCHAR(256),
                    city VARCHAR(256),
                    state VARCHAR(256),
                    country VARCHAR(256),
                    donate_link VARCHAR(600),
                    assistance_link VARCHAR(600),
                    img_url VARCHAR(600),
                    user_id INTEGER,
                    lat VARCHAR(256),
                    long VARCHAR(256)
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