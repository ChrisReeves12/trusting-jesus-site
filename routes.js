const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;

function getAuthors() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'static_content', 'authors.json'), 'utf8', (err, data) => {
            if (err) reject(err)
            else resolve(data);
        });
    });
}

function createAuthorHash(authors) {
    let author_hash = {};
    for (let author of authors) {
        author_hash[author.id_num] = author;
    }

    return author_hash;
}

function findOneArticle(dbo, slug) {
    return new Promise((resolve, reject) => {
        dbo.collection('articles').findOne({slug: slug, is_published: true}, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

function getAllArticles(dbo) {
    return new Promise((resolve, reject) => {
        dbo.collection('articles')
            .find({is_published: true})
            .toArray((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
    });
}

// Home page
router.get('/', async (req, res) => {

    let db = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING, {useNewUrlParser: true});
    let dbo = db.db(process.env.MONGO_DATABASE);
    let home_config = res.locals.home_config;
    let authors = JSON.parse(await getAuthors());

    // Get main article
    let main_article =  await findOneArticle(dbo, home_config.main_article);
    let sub_articles = [];

    for (let sub_article of home_config.sub_articles) {
        sub_articles.push(await findOneArticle(dbo, sub_article.slug));
    }

    // Get other articles not on page
    let other_articles = (await getAllArticles(dbo)).filter(other_article => {
        if (other_article.slug === main_article.slug)
            return false;

        if (sub_articles.find(sub_article => sub_article.slug === other_article.slug))
            return false;

        return true;
    });

    res.render('pages/index', {
        authors: createAuthorHash(authors),
        raw_authors: authors,
        home_config: home_config,
        sub_articles: sub_articles,
        main_article: main_article,
        other_articles: other_articles
    });
});

// How to be saved page
router.get('/how-to-be-saved', (req, res) => {
    const title = 'How To Be Saved';
    fs.readFile(path.join(__dirname, 'static_content', 'how-to-be-saved.html'), 'utf8', (err, content) => {

        res.render('pages/page', {
            head_title: title,
            title: title,
            sub_title: 'The Gospel',
            content: content,
            breadcrumbs: [
                {title: 'Home', link: '/'},
                {title: title, link: null}
            ]
        });
    });
});

// Statement of faith
router.get('/statement-of-faith', (req, res) => {
    const title = 'Statement Of Faith';
    fs.readFile(path.join(__dirname, 'static_content', 'statement-of-faith.html'), 'utf8', (err, content) => {

        res.render('pages/page', {
            head_title: title,
            title: title,
            sub_title: 'What We Believe',
            content: content,
            breadcrumbs: [
                {title: 'Home', link: '/'},
                {title: title, link: null}
            ]
        });
    });
});

router.get('/article/:slug', async (req, res) => {

    let db = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING, {useNewUrlParser: true});
    let dbo = db.db(process.env.MONGO_DATABASE);
    let authors = JSON.parse(await getAuthors());

    let article = await findOneArticle(dbo, req.params.slug);

    if (!article) {
        res.send(404).send('The article cannot be found...');
    } else {
        res.render('pages/article', {
            article: article,
            head_title: article.title,
            authors: createAuthorHash(authors),
            breadcrumbs: [
                {title: 'Home', link: '/'},
                {title: 'Articles', link: '/articles'},
                {title: article.title, link: null}
            ]
        })
    }
});

// Articles
router.get('/articles', async (req, res) => {

    // Get articles
    let db = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING, {useNewUrlParser: true});
    let dbo = db.db(process.env.MONGO_DATABASE);
    const title = 'News and Articles';

    try {

        let authors = JSON.parse(await getAuthors());

        let articles = await new Promise((resolve, reject) => {
            dbo.collection('articles')
                .find({is_published: true})
                .sort('published_date', -1)
                .toArray((err, data) => {
                if (err) reject(err);
                else resolve(data);
            })
        });

        res.render('pages/articles', {
            head_title: title,
            title: title,
            articles: articles,
            authors: createAuthorHash(authors),
            breadcrumbs: [
                {title: 'Home', link: '/'},
                {title: title, link: null}
            ]
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error: ' + err.message);
    }



});

// Edit/Create Article
router.get('/admin/article/:slug?', async (req, res) => {

    let db = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING, {useNewUrlParser: true});
    let dbo = db.db(process.env.MONGO_DATABASE);
    fs.readFile(path.join(__dirname, 'static_content', 'authors.json'), 'utf8', async (file_err, authors_data) => {

        if (file_err) {
            console.log(file_err);
            res.status(500).send('Error: ' + file_err.message);
        } else {

            const authors = JSON.parse(authors_data);

            // Get existing article
            let article = null;
            let getting_article_error = null;
            if (req.params.slug) {
                try {
                    article = await new Promise((resolve, reject) => {
                        dbo.collection('articles').findOne({slug: req.params.slug}, (perr, response) => {
                            if (perr)
                                reject(perr);
                            else
                                resolve(response);
                        });
                    });
                } catch (error) {
                    console.log(error);
                    getting_article_error = error;
                }
            }

            if (getting_article_error) {
                res.status(500).send('An error occurred: ' + getting_article_error.message);
                console.error(getting_article_error);
            } else {
                res.render('pages/add_edit_article', {
                    authors: authors,
                    article: article
                });
            }
        }
    });
});

// Post action to save article
router.post('/admin/article/:slug?', async (req, res) => {

    let db = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING, {useNewUrlParser: true});
    let dbo = db.db(process.env.MONGO_DATABASE);
    let body;

    if (req.params.slug) {
        try {
            body = req.body;
            body.published_date = new Date(req.body.published_date);
            body.is_published = (body.is_published === 'on');
            dbo.collection('articles').replaceOne({slug: req.body.id_slug}, body, (err, data) => {
                if (err) {
                    res.status(500).send('An error occurred: ' + err.message)
                } else {
                    res.redirect('/admin/article/' + req.body.slug + (req.query.pass ? `?pass=${req.query.pass}` : ''));
                }
            });


        } catch (err) {
            res.status(500).send('An error occurred: ' + err.message);
        }
    } else {
        body = req.body;
        body.published_date = new Date(req.body.published_date);
        body.is_published = (body.is_published === 'on');
        dbo.collection('articles').insertOne(body, (err, data) => {
            if (err) {
                res.status(500).send('An error occurred: ' + err.message)
            } else {
                res.redirect('/admin/article/' + req.body.slug + (req.query.pass ? `?pass=${req.query.pass}` : ''));
            }
        });
    }
});

module.exports = router;