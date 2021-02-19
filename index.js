const path = require('path');
const express = require('express');
require('dotenv').config();
const app = express();
app.enable('trust proxy');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { nanoid } = require('nanoid');
const yup = require('yup');
app.use(express.json());
app.use(express.static('./public'));

const notFoundPath = path.join(__dirname, 'public/404.html');

const state = {
    test: 'https://www.test.com',
    fb: 'https://www.facebook.com/nadavzilber'
};

app.get('/state', (req, res, next) => res.status(200).json(state));

app.get('/:id', async (req, res, next) => {
    const { id: slug } = req.params;
    try {
        const url = state[slug];
        if (url) {
            return res.redirect(url);
        }
        return res.status(404).sendFile(notFoundPath);
    } catch (error) {
        return res.status(404).sendFile(notFoundPath);
    }
});

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/^[\w\-]+$/i),
    url: yup.string().trim().url().required(),
});

app.post('/url', slowDown({
    windowMs: 30 * 1000,
    delayAfter: 1,
    delayMs: 500,
}), rateLimit({
    windowMs: 30 * 1000,
    max: 1,
}), async (req, res, next) => {
    let { slug, url } = req.body;
    try {
        await schema.validate({
            slug,
            url,
        });
        if (url.includes('katan.chik')) {
            throw new Error('Stop it. 🛑');
        }
        if (!slug) {
            slug = nanoid(5);
        } else {
            const existing = await state[slug];
            if (existing) {
                throw new Error('Slug in use. 🍔');
            }
        }
        slug = slug.toLowerCase();
        state[slug] = url;
        res.json({ slug, url });
    } catch (error) {
        next(error);
    }
});

app.use((req, res, next) => {
    res.status(404).sendFile(notFoundPath);
});

app.use((error, req, res, next) => {
    if (error.status) {
        res.status(error.status);
    } else {
        res.status(500);
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
    });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});