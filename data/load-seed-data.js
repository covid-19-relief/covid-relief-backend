require('dotenv').config();
const pg = require('pg');
const Client = pg.Client;
// import seed data:
const data = require('./data.json');

run();

async function run() {
    const client = new Client(process.env.DATABASE_URL);
    try {
        await client.connect();

        await Promise.all(
            data.map(listing => {
                return client.query(`
                    INSERT INTO relief_listings (name_of_fund, beneficiaries, purpose, administrator, city, state, country, donate_link, assistance_link, img_url, lat, long)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
                `,
                [listing.name_of_fund, listing.beneficiaries, listing.purpose, listing.administrator, listing.city, listing.state, listing.country, listing.donate_link, listing.assistance_link, listing.img_url, listing.lat, listing.long]);
            })
        );

        console.log('seed data load complete');
    }
    catch (err) {
        console.log(err);
    }
    finally {
        client.end();
    }
    
}
