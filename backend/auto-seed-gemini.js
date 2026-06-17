const fs = require('fs');

const PROMPT_TEMPLATE = "일본어 학습 앱을 만들고 있어. 초급(Beginner), N5, N4 수준의 일본어 단어 퀴즈 데이터를 생성해줘. 각 레벨별로 20개씩 만들어줘.\n" +
"결과는 데이터베이스에 바로 삽입할 수 있도록 SQL INSERT 문 형태로만 작성해 줘.\n" +
"테이블 이름은 'quizzes'이고, 컬럼은 'difficulty', 'type', 'question', 'answer', 'options_json', 'word', 'meaning', 'example_sentence', 'example_meaning', 'kanji_words_json', 'created_at' 이야.\n\n" +
"[데이터 작성 규칙]\n" +
"1. difficulty: 'Beginner', 'N5', 'N4' 중 하나.\n" +
"2. type: 무조건 'word'.\n" +
"3. question: '다음 단어의 뜻으로 알맞은 것은?' (고정).\n" +
"4. answer: 정답 뜻.\n" +
"5. options_json: 정답을 포함해 4개의 보기를 JSON 배열 문자열로 작성.\n" +
"6. word: 일본어 단어.\n" +
"7. meaning: 단어의 뜻.\n" +
"8. example_sentence: 실용적인 예문.\n" +
"9. example_meaning: 예문 해석.\n" +
"10. kanji_words_json: 한자가 있다면 [{\"kanji\": \"한자\", \"reading\": \"히라가나 발음\", \"meaning\": \"한국어 훈음\", \"radical\": \"부수 이름과 뜻\"}] 형태.\n" +
"11. created_at: 'NOW()'.\n" +
"12. 중복을 최대한 피해서 새로운 단어들을 만들어줘.\n\n" +
"[결과 예시 포맷]\n" +
"INSERT INTO quizzes (...) VALUES \n" +
"('N5', 'word', '다음 단어의 뜻으로 알맞은 것은?', '학교', '[\"학교\", \"병원\", \"식당\", \"회사\"]', '学校', '학교', '私は毎日学校に行きます。', '나는 매일 학교에 갑니다.', '[{\"kanji\": \"学\", \"reading\": \"がく\", \"meaning\": \"배울 학\", \"radical\": \"子 (아들 자)\"}]', NOW());\n";

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY environment variable is not set.');
        console.error('Run like this: GEMINI_API_KEY="your_key" node auto-seed-gemini.js');
        process.exit(1);
    }

    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'rootpassword',
        database: 'japeak'
    });

    console.log('Connected to MySQL. Starting Gemini generation loop...');
    
    // We will do 50 loops to generate roughly 1000 words (20 words per loop)
    for (let i = 0; i < 50; i++) {
        console.log(`[Loop ${i+1}/50] Calling Gemini API...`);
        try {
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: PROMPT_TEMPLATE }] }]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let sqlText = data.candidates[0].content.parts[0].text;
                
                // Clean up the markdown block
                sqlText = sqlText.replace(/```sql/g, '').replace(/```/g, '');
                
                // Find INSERT statements
                const insertMatch = sqlText.match(/INSERT INTO quizzes[\s\S]*?;/g);
                if (insertMatch) {
                    for (const sql of insertMatch) {
                        try {
                            await connection.query(sql);
                            console.log('Successfully inserted a batch.');
                        } catch (e) {
                            console.error('Failed to run generated SQL:', e.message);
                        }
                    }
                } else {
                    console.error('No INSERT statement found in Gemini response.');
                }
            } else {
                console.error('Unexpected Gemini response:', data);
            }
        } catch (e) {
            console.error('Gemini API call failed:', e.message);
        }

        console.log('Waiting 30 seconds before next call to avoid rate limits...');
        await new Promise(r => setTimeout(r, 30000));
    }

    console.log('Finished 50 loops!');
    await connection.end();
}

main().catch(console.error);
