
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

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
    const lesson_date = new Date().toISOString().slice(0, 10); // Get current date in YYYY-MM-DD format

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
