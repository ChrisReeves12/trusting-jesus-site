require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const routes = require('./routes');
const bodyParser = require('body-parser');
const fs = require('fs');
const port = 4000;
const moment = require('moment');

function getHomeConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'static_content', 'home.json'), 'utf8', (err, data) => {
            if (err) reject(err)
            else resolve(data);
        });
    });
}

function convertDate (datestring) {
    return moment(datestring).format('LL');
}

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Block admin to authed user only
app.use('/admin', (req, res, next) => {
    if (req.query.pass === process.env.APP_PASS)
        next();
    else
        res.status(403).send('You are not authorized to visit this page.');
});

app.use('/', async (req, res, next) => {
    res.locals.home_config = JSON.parse(await getHomeConfig());
    res.locals.convertDate = convertDate;
    next();
});

app.use('/', routes);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});