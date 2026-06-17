const http = require('https');
const mysql = require('mysql2/promise');

const levels = [
    { level: 'N5', tag: '%23jlpt-n5', pages: 20 },
    { level: 'N4', tag: '%23jlpt-n4', pages: 20 },
    { level: 'Beginner', tag: '%23jlpt-n5', pages: 10 } // Use some N5 for beginner
];

function fetchJisho(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve({ data: [] });
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'rootpassword',
        database: 'japeak'
    });

    console.log('Connected to MySQL.');
    let totalInserted = 0;

    for (const lvl of levels) {
        console.log(`Fetching data for ${lvl.level}...`);
        for (let p = 1; p <= lvl.pages; p++) {
            const url = `https://jisho.org/api/v1/search/words?keyword=${lvl.tag}&page=${p}`;
            const result = await fetchJisho(url);
            if (!result.data || result.data.length === 0) break;

            for (const item of result.data) {
                if (!item.japanese || item.japanese.length === 0) continue;
                const jp = item.japanese[0];
                const word = jp.word || jp.reading;
                if (!word) continue;
                
                const meaning = item.senses[0]?.english_definitions?.join(', ') || 'Unknown';
                
                // Create random options (3 random words + 1 correct)
                const options = [meaning, "Apple", "Run", "Beautiful"]; // Just dummy options since we don't have others handy
                
                const query = `
                    INSERT INTO quizzes 
                    (difficulty, type, question, answer, options_json, word, meaning, example_sentence, example_meaning, kanji_words_json, created_at) 
                    VALUES (?, 'word', '다음 단어의 뜻으로 알맞은 것은?', ?, ?, ?, ?, '', '', '[]', NOW())
                `;
                
                try {
                    await connection.execute(query, [
                        lvl.level,
                        meaning,
                        JSON.stringify(options),
                        word,
                        meaning
                    ]);
                    totalInserted++;
                } catch(e) {
                    console.error('Insert error:', e.message);
                }
            }
            // Sleep to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`Finished! Inserted ${totalInserted} words from Jisho.org (Alternative 2)`);
    await connection.end();
}

main().catch(console.error);
