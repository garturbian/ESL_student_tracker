
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/esl_tracker.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the esl_tracker database.');
});

const students = [
    { name: 'Ray', age: null, grade: 'N/A', occupation: null, days_and_times: 'Monday 10:00', esl_level: 'A1', teacher_comments: '', google_docs_links: '' },
    { name: 'Doreen', age: 30, grade: null, occupation: 'Engineer', days_and_times: 'Tuesday 14:00', esl_level: 'B2', teacher_comments: '', google_docs_links: '' },
    { name: 'Angel', age: 28, grade: null, occupation: 'Artist', days_and_times: 'Wednesday 11:00', esl_level: 'C1', teacher_comments: '', google_docs_links: '' },
    { name: 'Alan', age: 10, grade: '5', occupation: null, days_and_times: 'Thursday 16:00', esl_level: 'A2', teacher_comments: '', google_docs_links: '' },
    { name: 'Yumi', age: 12, grade: '7', occupation: null, days_and_times: 'Friday 15:00', esl_level: 'B1', teacher_comments: '', google_docs_links: '' },
    { name: 'Archer', age: 9, grade: '4', occupation: null, days_and_times: 'Monday 17:00', esl_level: 'A1', teacher_comments: '', google_docs_links: '' },
    { name: 'Frankie', age: 15, grade: '10', occupation: null, days_and_times: 'Tuesday 18:00', esl_level: 'B1', teacher_comments: '', google_docs_links: '' }
];

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

    const stmt = db.prepare(`INSERT INTO students (name, age, grade, occupation, days_and_times, esl_level, teacher_comments, google_docs_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    students.forEach(student => {
        stmt.run(student.name, student.age, student.grade, student.occupation, student.days_and_times, student.esl_level, student.teacher_comments, student.google_docs_links);
    });
    stmt.finalize();
});

db.close();
