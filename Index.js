const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// කෙලින්ම root එකට (/ ) හෝ /api/news ට ගිය විට JSON දත්ත ලබා දීම
app.get('/', async (req, res) => {
    try {
        const url = 'https://thehackernews.com/';
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const $ = cheerio.load(data);
        const articles = [];

        $('.body-post').each((index, element) => {
            const title = $(element).find('.home-title').text().trim();
            const link = $(element).attr('href') || $(element).find('a').attr('href');
            const snippet = $(element).find('.home-desc').text().trim();
            const date = $(element).find('.item-label').text().trim();
            const image = $(element).find('.home-img img').attr('src') || $(element).find('img').attr('data-src');

            if (title) {
                articles.push({
                    title,
                    link,
                    snippet,
                    date,
                    image
                });
            }
        });

        res.json({
            success: true,
            total: articles.length,
            data: articles
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to scrape data',
            message: error.message
        });
    }
});

// Local පරිසරයේ Run කිරීමට
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
