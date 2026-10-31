const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

// Home Route
app.get('/', (req, res) => {
    res.json({
        message: "Scraper API is Live on Vercel!",
        endpoints: {
            hackernews_latest: "/api/hackernews/latest",
            hackernews_read: "/api/hackernews/read?url=ARTICLE_URL"
        }
    });
});

// --- THE HACKER NEWS API ROUTES ---

app.get('/api/hackernews/latest', async (req, res) => {
    try {
        const searchQuery = req.query.search;
        let targetUrl = 'https://thehackernews.com/';
        
        if (searchQuery) {
            targetUrl = `https://thehackernews.com/search?q=${encodeURIComponent(searchQuery)}`;
        }

        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(response.data);
        const articles = [];

        $('.body-post, .story-box, .post-outer, article').each((index, el) => {
            const titleEl = $(el).find('h2.home-title, h2.story-title, .post-title a, h2 a').first();
            const title = titleEl.text().trim();
            const link = titleEl.attr('href') || $(el).find('a').first().attr('href');

            const imgEl = $(el).find('img').first();
            const image = imgEl.attr('src') || imgEl.attr('data-src') || null;

            const snippetEl = $(el).find('.home-desc, .story-snippet, .post-snippet, p').first();
            const snippet = snippetEl.text().trim();

            const dateEl = $(el).find('.item-label, .story-date, .date').first();
            const date = dateEl.text().trim();

            if (title && link) {
                articles.push({
                    id: index + 1,
                    title: title.replace(/\s+/g, ' '),
                    date: date || null,
                    image: image,
                    snippet: snippet,
                    article_url: link
                });
            }
        });

        const uniqueArticles = Array.from(new Map(articles.map(item => [item['article_url'], item])).values());

        res.json({
            status: true,
            source: "TheHackerNews.com",
            search_query: searchQuery || null,
            total_items: uniqueArticles.length,
            articles: uniqueArticles
        });

    } catch (error) {
        res.status(500).json({ status: false, message: "Error fetching news list", error: error.message });
    }
});

app.get('/api/hackernews/read', async (req, res) => {
    try {
        const articleUrl = req.query.url;
        if (!articleUrl) {
            return res.status(400).json({ status: false, message: "පුවතේ URL එක (url parameter එක) ලබා දෙන්න." });
        }

        const response = await axios.get(articleUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(response.data);

        const title = $('h1.story-title, h1.post-title, h1').first().text().trim();
        const author = $('.author, .h-card').first().text().trim() || 'The Hacker News';
        const date = $('.story-date, .date').first().text().trim() || '';

        const contentArea = $('.articlebody, .post-body, .entry-content');
        contentArea.find('script, style, iframe, .u-full-width, .infox, .note, div[id*="google_ads"]').remove();

        let coverImage = null;
        const imgEl = contentArea.find('img').first();
        if (imgEl.length > 0) {
            coverImage = imgEl.attr('src') || imgEl.attr('data-src') || null;
        }

        let paragraphs = [];
        contentArea.find('p, span').each((_, el) => {
            const text = $(el).clone().children().remove().end().text().trim() || $(el).text().trim();

            if (
                text.length > 10 &&
                !text.toLowerCase().includes('the hacker news') &&
                !text.toLowerCase().includes('sign up') &&
                !text.toLowerCase().includes('subscribe')
            ) {
                if (!paragraphs.includes(text)) {
                    paragraphs.push(text);
                }
            }
        });

        if (paragraphs.length === 0) {
            const rawText = contentArea.text().trim();
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
            lines.forEach(line => {
                if (!paragraphs.includes(line)) {
                    paragraphs.push(line);
                }
            });
        }

        if (paragraphs.length === 0) {
            return res.status(404).json({ status: false, message: "පුවත කියවීමට හෝ ලබා ගැනීමට නොහැකි විය." });
        }

        res.json({
            status: true,
            source: "TheHackerNews.com",
            article_url: articleUrl,
            data: {
                title: title,
                author: author,
                date: date,
                cover_image: coverImage,
                total_paragraphs: paragraphs.length,
                full_article: paragraphs.join('\n\n'),
                paragraphs: paragraphs
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: "Error fetching article content", error: error.message });
    }
});

// Local development support (Vercel handles serverless execution automatically)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}

module.exports = app;
