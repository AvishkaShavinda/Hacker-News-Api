const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Home Route
app.get('/', (req, res) => {
    res.json({
        message: "Sri Lanka News Scraper API is Live!",
        endpoints: {
            sirasa: "/api/sirasa",
            derana: "/api/derana"
        }
    });
});

// 1. SIRASA (NEWSFIRST) API
app.get('/api/sirasa', async (req, res) => {
    try {
        const { data } = await axios.get('https://sinhala.newsfirst.lk/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        const articles = [];

        $('a').each((i, el) => {
            const link = $(el).attr('href');
            const title = $(el).text().trim();
            const parent = $(el).closest('div, article, section');
            const image = parent.find('img').attr('src') || parent.find('img').attr('data-src');
            const description = parent.find('p, .description, .excerpt').text().trim();

            if (link && title && title.length > 15 && (link.includes('/202') || link.includes('/news/'))) {
                articles.push({
                    id: articles.length + 1,
                    title: title.replace(/\s+/g, ' '),
                    description: description || "විස්තරයක් ලබා දී නොමැත.",
                    link: link.startsWith('http') ? link : `https://sinhala.newsfirst.lk${link}`,
                    image: image || null
                });
            }
        });

        const uniqueArticles = Array.from(new Map(articles.map(item => [item['link'], item])).values());
        res.json({ status: true, source: "Sirasa Newsfirst", total: uniqueArticles.length, data: uniqueArticles });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

// 2. DERANA API (Description 100% වැඩ කරන ලෙස)
app.get('/api/derana', async (req, res) => {
    try {
        const { data } = await axios.get('https://sinhala.adaderana.lk/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        const articles = [];

        $('.news-story, .story-text, .hot-news, article, .news-block').each((i, el) => {
            const titleEl = $(el).find('a').first();
            const title = $(el).find('h2, h3, h4, a').text().trim();
            const link = titleEl.attr('href') || $(el).find('a').attr('href');
            const image = $(el).find('img').attr('src');
            
            // Description එක හොයාගැනීමට හැකි ක්‍රම කිහිපයක්
            let description = $(el).find('p').text().trim();
            if (!description) {
                description = $(el).contents().filter(function() {
                    return this.nodeType === 3;
                }).text().trim();
            }

            if (link && title && title.length > 10 && (link.includes('news_comments.php') || link.includes('news.php'))) {
                const fullLink = link.startsWith('http') ? link : `https://sinhala.adaderana.lk/${link}`;
                const fullImage = image ? (image.startsWith('http') ? image : `https://sinhala.adaderana.lk/${image}`) : null;

                articles.push({
                    id: articles.length + 1,
                    title: title.replace(/\s+/g, ' ').split('Read More')[0].trim(),
                    description: description.replace(/\s+/g, ' ') || "විස්තරයක් ලබා දී නොමැත.",
                    link: fullLink,
                    image: fullImage
                });
            }
        });

        const uniqueArticles = Array.from(new Map(articles.map(item => [item['link'], item])).values());
        res.json({ status: true, source: "Ada Derana", total: uniqueArticles.length, data: uniqueArticles });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

module.exports = app;
