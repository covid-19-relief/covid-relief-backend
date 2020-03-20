# air-backend

api/auth
.use

/api/admin
.us (ensureAuth)

/listings
.get

/listings/:listingID
.get

/listings/state/:stateID
.get

/listings/city/:cityID (just in case)
.get

/listings/country/:countryID (just in case)
.get

/listings/program/:programID (just in case)
.get

/api/admin/listings
.post for admin

/api/admin/listings/:listingID
.put for admin
OR .patch

/api/admin/listings/:listingID
.delete for admin

/search
.get
(search all listings)

*
.get (404)
