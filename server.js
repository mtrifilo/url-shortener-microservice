const mongoose    = require('mongoose');
const ShortUrl    = require('./models/shorturl');

const validator   = require('validator');
const shortid     = require('shortid');
const compression = require('compression');
const express     = require('express');
const app         = express();

/**
 * Initiallize MongoDB
 */

mongoose.connect('mongodb://localhost:27017/local');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongoose encountered an error.'));
db.once('open', function() {
    console.log('mongodb connected!');
});

/**
 * Handle Requests
 */

app.use(compression());

app.use('/', express.static(__dirname + '/public'));

let url;
var errorResponse = { error: url + " is not valid."};

app.use('/*', function redirectHandler(req, res, next) {

    // ignore requests for /favicon.ico
    if (req.params[0] === 'favicon.ico') {
        return;
    }
    
    url = req.params[0];
    let validUrl = validator.isURL(url);

    if (!validUrl) {

        return redirectToOriginalUrl(res, errorResponse);

    }

    next();

}, function newShortUrlHandler(req, res, next) {

    let generatedID = shortid.generate();
    let shortendURL = `${req.hostname}/${generatedID}`;

    saveNewShortUrl(generatedID, shortendURL, res, function (newShortUrl) {
        return res.json(newShortUrl);
    });

});

function redirectToOriginalUrl(res, errorResponse) {

    return ShortUrl.findOne({'id': url}, 'original_url', (err, shortUrl) => {
        if (err) {
            return res.status(500).send({
                error: "An error occured: " + err
            });                
        } else if (shortUrl) {
            return res.redirect(shortUrl.original_url);
        } else {
            return res.status(404).send({ 
                error: url + " does not match any saved links, and is not a valid URL."
            });
        }

    });

}

function saveNewShortUrl(generatedID, shortenedURL, res, callback) {

    let newShortUrl = new ShortUrl({
        id: generatedID,
        original_url: url,
        short_url: shortenedURL
    });

    return newShortUrl.save( (err, newShortUrl) => {
        if (err) {
            return res.status(500).send(err);
        }
        console.log('New short URL saved!');

        return callback(newShortUrl);
    });

}

const server = app.listen(process.env.PORT || 4000, () => {
    console.log('Express app listening!');
});

module.exports = server;