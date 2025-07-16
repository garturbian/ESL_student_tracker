document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-student-button').addEventListener('click', () => {
        const newStudent = {
            name: document.getElementById('new-student-name').value,
            age: document.getElementById('new-student-age').value || null,
            grade: document.getElementById('new-student-grade').value || null,
            occupation: document.getElementById('new-student-occupation').value || null,
            days_and_times: document.getElementById('new-student-days-and-times').value || null,
            esl_level: document.getElementById('new-student-esl-level').value || null,
            teacher_comments: '',
            google_docs_links: ''
        };

        fetch('/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newStudent),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'success') {
                alert('Student created successfully!');
                // Clear the form
                document.getElementById('new-student-name').value = '';
                document.getElementById('new-student-age').value = '';
                document.getElementById('new-student-grade').value = '';
                document.getElementById('new-student-occupation').value = '';
                document.getElementById('new-student-days-and-times').value = '';
                document.getElementById('new-student-esl-level').value = '';
            } else {
                alert('Error creating student: ' + data.error);
            }
        });
    });
});