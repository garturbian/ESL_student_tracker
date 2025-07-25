const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const gslWords = require('./gsl-words2.js');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const db = new sqlite3.Database('./database/esl_tracker.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the esl_tracker database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age TEXT,
        grade TEXT,
        occupation TEXT,
        days_and_times TEXT,
        esl_level TEXT,
        teacher_comments TEXT,
        google_docs_links TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS vocabulary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        word TEXT NOT NULL,
        translation TEXT,
        lesson_date DATE,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )`);
});

app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/students', (req, res) => {
    const { name, age, grade, occupation, days_and_times, esl_level, teacher_comments, google_docs_links } = req.body;

    if (!name) {
        return res.status(400).json({ "error": "Student name is required." });
    }

    const stmt = db.prepare(`INSERT INTO students (name, age, grade, occupation, days_and_times, esl_level, teacher_comments, google_docs_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(name, age, grade, occupation, days_and_times, esl_level, teacher_comments, google_docs_links, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.status(201).json({
            "message": "success",
            "data": {
                id: this.lastID,
                name,
                age,
                grade,
                occupation,
                days_and_times,
                esl_level,
                teacher_comments,
                google_docs_links
            }
        });
    });
    stmt.finalize();
});

app.post('/api/vocabulary', (req, res) => {
    const { student_id, word, translation } = req.body;
    const lesson_date = new Date().toISOString().slice(0, 10);

    if (!student_id || !word) {
        return res.status(400).json({ "error": "Missing required fields: student_id and word" });
    }

    const stmt = db.prepare(`INSERT INTO vocabulary (student_id, word, translation, lesson_date) VALUES (?, ?, ?, ?)`);
    stmt.run(student_id, word, translation, lesson_date, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.json({
            "message": "success",
            "data": {
                id: this.lastID,
                student_id,
                word,
                translation,
                lesson_date
            }
        });
    });
    stmt.finalize();
});

app.get('/api/students/:id/vocabulary', (req, res) => {
    db.all("SELECT * FROM vocabulary WHERE student_id = ?", [req.params.id], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

app.patch('/api/students/:id', (req, res) => {
    const studentId = req.params.id;
    const updates = req.body;
    const fields = [];
    const values = [];

    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ "error": "No update data provided." });
    }

    values.push(studentId);

    const sql = `UPDATE students SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

app.put('/api/vocabulary/:id', (req, res) => {
    const { word, translation } = req.body;
    const vocabId = req.params.id;

    if (!word || !translation) {
        return res.status(400).json({ "error": "Missing required fields: word and translation" });
    }

    db.run(`UPDATE vocabulary SET word = ?, translation = ? WHERE id = ?`,
        [word, translation, vocabId],
        function(err) {
            if (err) {
                return res.status(500).json({ "error": err.message });
            }
            res.json({
                message: "success",
                changes: this.changes
            });
        });
});

app.delete('/api/vocabulary/:id', (req, res) => {
    const vocabId = req.params.id;

    db.run(`DELETE FROM vocabulary WHERE id = ?`, vocabId, function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

app.post('/api/lessons', (req, res) => {
    const { student_id, student_name, start_word_rank, num_words } = req.body;

    if (!student_id || !student_name || !start_word_rank || !num_words) {
        return res.status(400).json({ "error": "Missing required fields" });
    }

    const startIndex = parseInt(start_word_rank, 10) - 1;
    const numWords = parseInt(num_words, 10);
    const endIndex = startIndex + numWords;

    if (startIndex < 0 || endIndex > gslWords.length || startIndex >= endIndex || numWords <= 0) {
        return res.status(400).json({ "error": "Invalid word range or number of words" });
    }

    const lessonWords = gslWords.slice(startIndex, endIndex);

    const lessonHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lesson for ${student_name}</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <h1>Lesson for ${student_name}</h1>
            <h2>Words from rank ${start_word_rank} to ${endIndex}</h2>
            <form id="progress-form">
                <ul>
                    ${lessonWords.map(word => `<li><input type="checkbox" name="learned_words" value="${word}"> ${word}</li>`).join('')}
                </ul>
                <input type="hidden" name="student_id" value="${student_id}">
                <button type="submit">Save Progress</button>
            </form>
            <script>
                document.getElementById('progress-form').addEventListener('submit', function(event) {
                    event.preventDefault();
                    const formData = new FormData(this);
                    const studentId = formData.get('student_id');
                    const learnedWords = formData.getAll('learned_words');

                    fetch('/api/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: studentId, learned_words: learnedWords })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message === 'success') {
                            alert('Progress saved!');
                        } else {
                            alert('Error saving progress.');
                        }
                    });
                });
            </script>
        </body>
        </html>
    `;

    const lessonFileName = `lesson_${student_id}_${Date.now()}.html`;
    const lessonFilePath = path.join(__dirname, 'public', lessonFileName);

    fs.writeFile(lessonFilePath, lessonHtml, (err) => {
        if (err) {
            return res.status(500).json({ "error": "Failed to save lesson file" });
        }

        const lessonLink = `/${lessonFileName}`;
        db.get("SELECT google_docs_links FROM students WHERE id = ?", [student_id], (err, row) => {
            if (err) {
                return res.status(500).json({ "error": err.message });
            }

            let existingLinks = [];
            if (row && row.google_docs_links) {
                try {
                    existingLinks = JSON.parse(row.google_docs_links);
                } catch (e) {
                    existingLinks = [];
                }
            }

            const newLink = { name: `Lesson ${start_word_rank}-${endIndex}`, url: lessonLink };
            const updatedLinks = JSON.stringify([...existingLinks, newLink]);

            db.run(`UPDATE students SET google_docs_links = ? WHERE id = ?`, [updatedLinks, student_id], function(err) {
                if (err) {
                    return res.status(500).json({ "error": err.message });
                }
                res.json({ 
                    "message": "success", 
                    "lesson_url": lessonLink 
                });
            });
        });
    });
});

app.post('/api/progress', (req, res) => {
    const { student_id, learned_words } = req.body;

    if (!student_id || !learned_words || !Array.isArray(learned_words)) {
        return res.status(400).json({ "error": "Missing required fields" });
    }

    const lesson_date = new Date().toISOString().slice(0, 10);
    const stmt = db.prepare(`INSERT INTO vocabulary (student_id, word, lesson_date) VALUES (?, ?, ?)`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        learned_words.forEach(word => {
            stmt.run(student_id, word, lesson_date);
        });
        db.run("COMMIT");
    });

    stmt.finalize((err) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.json({ "message": "success" });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});