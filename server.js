// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('./lib/client.js');
const request = require('superagent');

// Initiate database connection
client.connect();

// Application Setup
const app = express();
const PORT = process.env.PORT;
app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data
app.use(express.urlencoded({ extended:true })); //security parsing an encoded url


// Auth Routes
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');

const authRoutes = createAuthRoutes({
    async selectUser(email) {
        const result = await client.query(`
            SELECT id, email, hash, display_name as "displayName" 
            FROM users
            WHERE email = $1;
        `, [email]);
        return result.rows[0];
    },
    async insertUser(user, hash) {
        console.log(user);
        const result = await client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email, display_name;
        `, [user.email, hash);
        return result.rows[0];
    }
});

// before ensure auth, but after other middleware:
// app.use('/api/auth', authRoutes);

// setup authentication routes
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api/admin', ensureAuth);

//////////////

//Dev Get Users Route
app.get('/users', async(req, res) => {

    try {
        const result = await client.query(`
            SELECT * FROM users
        `,);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});


//All listings Get route
app.get('/listings', async(req, res) => {

    try {
        const result = await client.query(`
            SELECT * FROM relief_listings 
        `,);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//All listing Get by id route
app.get('/listings/:listingID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM relief_listings
            WHERE id = ${req.params.listingID}
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//get by US state
app.get('/listings/state/:stateID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM relief_listings
            WHERE state = '${req.params.stateID}'
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//get by country
app.get('/listings/country/:countryID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM relief_listings
            WHERE country = '${req.params.countryID}'
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//User create new listing only if logged in
app.post('/api/admin/listings', async(req, res) => {
    try {
        const {
            name_of_fund,
            beneficiaries,
            purpose,
            administrator,
            city,
            state,
            country,
            donate_link,
            assistance_link,
            img_url,
            user_id,
            lat,
            long
       } = req.body;

        const newListing = await client.query(`
            INSERT INTO relief_listings (name_of_fund, beneficiaries, purpose, administrator, city, state, country, donate_link, assistance_link, img_url, user_id, lat, long)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            returning *
        `, [
            name_of_fund,
            beneficiaries,
            purpose,
            administrator,
            city,
            state,
            country,
            donate_link,
            assistance_link,
            img_url,
            user_id,
            lat,
            long
        ]);

        res.json(newListing.rows[0]);

    } catch (e) {
        console.error(e);
    }
});

// //Will be ADMIN edit listing
app.put('/api/admin/listings/:listingID', async(req, res) => {
    // using req.body instead of req.params or req.query (which belong to /GET requests)
    try {
        console.log(req.body);
        // make a new cat out of the cat that comes in req.body;
        const result = await client.query(`
            UPDATE relief_listings
            SET name_of_fund = '${req.body.name_of_fund}', 
                beneficiaries = '${req.body.beneficiaries}', 
                purpose = '${req.body.purpose}', 
                administrator = '${req.body.administrator}',
                city = '${req.body.city}',
                state = '${req.body.state}',
                country = '${req.body.country}',
                donate_link = '${req.body.donate_link}',
                assistance_link = '${req.body.assistance_link}',
                img_url = '${req.body.img_url}',
                user_id = '${req.body.user_id}',
                lat = '${req.body.lat}',
                long = '${req.body.long}'

            WHERE id = ${req.params.listingID};
        `,
        );

        res.json(result.rows[0]); // return just the first result of our query
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//Will Be Admin delete listing
app.delete('/api/admin/listings/:listingID', async(req, res) => {
    try {
        const result = await client.query(`
        DELETE FROM relief_listings
        WHERE id = ${req.params.listingID} es
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

//Get SEARCH all listings
app.get('/search', async(req, res) => {
    try {
        console.log(req.query.search);
        const result = await client.query(`
            SELECT * FROM relief_listings 
            WHERE name_of_fund ILIKE '%${req.query.search}%'
            OR state ILIKE '%${req.query.search}%' 
            OR continent ILIKE '%${req.query.search}%'
            OR purpose ILIKE '%${req.query.search}%'
            OR art_medium ILIKE '%${req.query.search}%'
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

// app.get('/api/me/geocode', async(req, res) => {
//     const data = await request.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.query.search}&key=${process.env.GOOGLE_MAPS_API_KEY}`);

//     res.json(data.body);
// });

//404 page
app.get('*', (req, res) => {
    res.send('404 error... Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log('server running on PORT', PORT);
});