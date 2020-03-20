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
            INSERT into users (email, hash, display_name, is_admin)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, display_name;
        `, [user.email, hash, user.display_name, user.is_admin]);
        return result.rows[0];
    }
});

// before ensure auth, but after other middleware:
// app.use('/api/auth', authRoutes);

// setup authentication routes
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api/me', ensureAuth);

//////////////

//User's Listings Get Route for viewing and then editing with a put below
app.get('/api/me/listings', async(req, res) => {
    try {
        const myQuery = `
            SELECT * FROM air_listings
            WHERE user_id=$1
        `;
        
        const favorites = await client.query(myQuery, [req.userId]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});

//Favorites Get only if logged in
app.get('/api/me/favorites', async(req, res) => {
    try {
        const myQuery = `
            SELECT * FROM favorites
            WHERE user_id=$1
        `;
        
        const favorites = await client.query(myQuery, [req.userId]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});

//Favorites Delete only if logged in
app.delete('/api/me/favorites/:id', async(req, res) => {
    try {
        const myQuery = `
            DELETE FROM favorites
            WHERE id=$1
            RETURNING *
        `;
        
        const favorites = await client.query(myQuery, [req.params.id]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});

//Favorites Create only if logged in
app.post('/api/me/favorites', async(req, res) => {
    try {
        const {
            program_name,
            address,
            city,
            state,
            zip_code,
            country,
            continent,
            phone_num,
            email,
            art_medium,
            img_url,
            link_url,
            description,
            is_grant
        } = req.body;

        const newFavorites = await client.query(`
            INSERT INTO favorites (program_name, address, city, state, zip_code, country, continent, phone_num, email, art_medium, img_url, link_url, description, user_id, is_grant)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            returning *
        `, [
            program_name, 
            address, 
            city, 
            state,
            zip_code,
            country,
            continent,
            phone_num,
            email,
            art_medium,
            img_url,
            link_url,
            description,
            req.userId,
            is_grant
        ]);

        res.json(newFavorites.rows[0]);

    } catch (e) {
        console.error(e);
    }
});

//get favorites by user ID - for front page
app.get('/favorites/:userID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM favorites
            WHERE user_id = '${req.params.userID}'
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

//Dev Get User ID
app.get('/users/:userID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM users
            WHERE id = '${req.params.userID}'
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

//All listings Get route
app.get('/listings', async(req, res) => {

    try {
        const result = await client.query(`
            SELECT * FROM air_listings 
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



//Some listings Get page route
app.get('/listings/page/:pageID', async(req, res) => {

    try {
        const result = await client.query(`
            SELECT * FROM air_listings
            LIMIT 20 OFFSET (${req.params.pageID} - 1) * 20
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
            FROM air_listings
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
            FROM air_listings
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

//get distinct from US states
app.get('/listings/state/dropdown/:id', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT DISTINCT state
            FROM air_listings
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

//get by city
app.get('/listings/city/:cityID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM air_listings
            WHERE city = '${req.params.cityID}'
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
            FROM air_listings
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

//get by program name, needs WHOLE program name
app.get('/listings/program/:programID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM air_listings
            WHERE program_name = '${req.params.programID}'
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

//get by continent
app.get('/listings/continent/:continentID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM air_listings
            WHERE continent = '${req.params.continentID}'
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
app.post('/api/me/listings', async(req, res) => {
    try {
        const {
            program_name,
            address,
            city,
            state,
            zip_code,
            country,
            continent,
            phone_num,
            email,
            art_medium,
            img_url,
            link_url,
            description,
            is_grant,
            lat,
            long
        } = req.body;

        const newListing = await client.query(`
            INSERT INTO air_listings (program_name, address, city, state, zip_code, country, continent, phone_num, email, art_medium, img_url, link_url, description, user_id, is_grant, lat, long)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            returning *
        `, [
            program_name, 
            address, 
            city, 
            state,
            zip_code,
            country,
            continent,
            phone_num,
            email,
            art_medium,
            img_url,
            link_url,
            description,
            req.userId,
            is_grant,
            lat,
            long
        ]);

        res.json(newListing.rows[0]);

    } catch (e) {
        console.error(e);
    }
});

//User edit listing by user_id
app.put('/api/me/listings/:listingID', async(req, res) => {
    // using req.body instead of req.params or req.query (which belong to /GET requests)
    try {
        console.log(req.body);
        // make a new cat out of the cat that comes in req.body;
        const result = await client.query(`
            UPDATE air_listings
            SET program_name = '${req.body.program_name}', 
            address = '${req.body.address}', 
            city = '${req.body.city}', 
            state = '${req.body.state}',
            zip_code = '${req.body.zip_code}',
            country = '${req.body.country}',
            continent = '${req.body.continent}',
            phone_num = '${req.body.phone_num}',
            email = '${req.body.email}',
            art_medium = '${req.body.art_medium}',
            img_url = '${req.body.img_url}',
            link_url = '${req.body.link_url}',
            description = '${req.body.description}',
            is_grant = '${req.body.is_grant}',
            lat = '${req.body.lat}',
            long = '${req.body.long}'
            
            WHERE id = ${req.params.listingID} AND user_id=$1;
        `, [req.userId]
        );

        res.json(result.rows[0]); // return just the first result of our query
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || onoo
        });
    }
});

// //Will Be Admin edit any listing -- attempt 1
// app.put('/api/me/admin/listings/:listingID', async(req, res) => {
//     // using req.body instead of req.params or req.query (which belong to /GET requests)
//     try {
//         console.log(req.body);
//         // make a new cat out of the cat that comes in req.body;
//         const result = await client.query(`

        
//             UPDATE air_listings
//             SET program_name = '${req.body.program_name}', 
//             address = '${req.body.address}', 
//             city = '${req.body.city}', 
//             state = '${req.body.state}',
//             zip_code = '${req.body.zip_code}',
//             country = '${req.body.country}',
//             continent = '${req.body.continent}',
//             phone_num = '${req.body.phone_num}',
//             email = '${req.body.email}',
//             art_medium = '${req.body.art_medium}',
//             img_url = '${req.body.img_url}',
//             link_url = '${req.body.link_url}',
//             description = '${req.body.description}',
//             is_grant = '${req.body.is_grant}'

//             FROM air_listings AS thing, users AS useID   
// 			WHERE thing.id = ${req.params.listingID} AND useID.is_admin=$1;
//         `, [true]
//         );

//         res.json(result.rows[0]); // return just the first result of our query
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || onoo
//         });
//     }
// });

// //Will Be Admin edit any listing -- attempt 2
// app.put('/api/me/admin/listings/:listingID', async(req, res) => {
//     // using req.body instead of req.params or req.query (which belong to /GET requests)
//     try {
//         console.log(req.body);
//         // make a new cat out of the cat that comes in req.body;
//         const result = await client.query(`
//             UPDATE air_listings
//             SET program_name = '${req.body.program_name}', 
//             address = '${req.body.address}', 
//             city = '${req.body.city}', 
//             state = '${req.body.state}',
//             zip_code = '${req.body.zip_code}',
//             country = '${req.body.country}',
//             continent = '${req.body.continent}',
//             phone_num = '${req.body.phone_num}',
//             email = '${req.body.email}',
//             art_medium = '${req.body.art_medium}',
//             img_url = '${req.body.img_url}',
//             link_url = '${req.body.link_url}',
//             description = '${req.body.description}',
//             is_grant = '${req.body.is_grant}'
  
// 			WHERE id = ${req.params.listingID};
//         `,
//         );

//         res.json(result.rows[0]); // return just the first result of our query
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({
//             error: err.message || onoo
//         });
//     }
// });

// //Will be ADMIN edit listing
app.put('/api/me/admin/listings/:listingID', async(req, res) => {
    // using req.body instead of req.params or req.query (which belong to /GET requests)
    try {
        console.log(req.body);
        // make a new cat out of the cat that comes in req.body;
        const result = await client.query(`
            UPDATE air_listings
            SET program_name = '${req.body.program_name}', 
                address = '${req.body.address}', 
                city = '${req.body.city}', 
                state = '${req.body.state}',
                zip_code = '${req.body.zip_code}',
                country = '${req.body.country}',
                continent = '${req.body.continent}',
                phone_num = '${req.body.phone_num}',
                email = '${req.body.email}',
                art_medium = '${req.body.art_medium}',
                img_url = '${req.body.img_url}',
                link_url = '${req.body.link_url}',
                description = '${req.body.description}',
                is_grant = '${req.body.is_grant}',
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
app.delete('/api/me/admin/listings/:listingID', async(req, res) => {
    try {
        const result = await client.query(`
        DELETE FROM air_listings
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

//user delete listing
app.delete('/api/me/listings/:listingID', async(req, res) => {
    try {
        const result = await client.query(`
        DELETE FROM air_listings
        WHERE id = ${req.params.listingID} AND user_id=$1; 
        `, [req.userId]);

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
            SELECT * FROM air_listings 
            WHERE program_name ILIKE '%${req.query.search}%'
            OR city ILIKE '%${req.query.search}%' 
            OR state ILIKE '%${req.query.search}%' 
            OR zip_code ILIKE '%${req.query.search}%' 
            OR continent ILIKE '%${req.query.search}%'
            OR description ILIKE '%${req.query.search}%'
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

app.get('/test/search/:pageID', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT *
            FROM air_listings 
            WHERE id || program_name || city || state || zip_code || country || continent || description || art_medium
            ILIKE '%${req.query.search}%'
            LIMIT 20 OFFSET (${req.params.pageID} - 1) * 20;
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

app.get('/api/me/geocode', async(req, res) => {
    const data = await request.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.query.search}&key=${process.env.GOOGLE_MAPS_API_KEY}`);

    res.json(data.body);
});

//404 page
app.get('*', (req, res) => {
    res.send('404 error... Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log('server running on PORT', PORT);
});