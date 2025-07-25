
document.addEventListener('DOMContentLoaded', () => {
    const studentsContainer = document.getElementById('students-container');

    // Modal elements
    const addLinkModal = document.getElementById('add-link-modal');
    const createLessonModal = document.getElementById('create-lesson-modal');
    const closeButton = document.querySelector('#add-link-modal .close-button');
    const closeLessonModalButton = document.querySelector('#create-lesson-modal .close-button');
    const saveLinkButton = document.getElementById('save-link-button');
    const generateLessonButton = document.getElementById('generate-lesson-button');
    const modalStudentId = document.getElementById('modal-student-id');
    const lessonModalStudentId = document.getElementById('lesson-modal-student-id');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const startWordRankInput = document.getElementById('start-word-rank');
    const numWordsInput = document.getElementById('num-words');

    let currentStudentGoogleDocsLinks = ''; 

    function fetchAndDisplayStudents() {
        studentsContainer.innerHTML = ''; 
        fetch('/api/students')
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.length > 0) {
                    data.data.forEach(student => {
                        let googleDocsDisplayHtml = '';
                        if (student.google_docs_links) {
                            try {
                                const links = JSON.parse(student.google_docs_links);
                                googleDocsDisplayHtml = '<ul>';
                                links.forEach(link => {
                                    googleDocsDisplayHtml += `<li><a href="${link.url}" target="_blank">${link.name}</a></li>`;
                                });
                                googleDocsDisplayHtml += '</ul>';
                            } catch (e) {
                                googleDocsDisplayHtml = '<p>Could not parse lesson links.</p>';
                            }
                        }

                        const studentCard = document.createElement('div');
                        studentCard.classList.add('student-card');
                        studentCard.dataset.studentId = student.id;
                        studentCard.innerHTML = `
                            <h3 class="student-card-header">${student.name}</h3>
                            <div class="student-card-content" style="display: none;">
                                <p><strong>Name:</strong> <input type="text" class="edit-student-name" value="${student.name}"></p>
                                <p><strong>Age & Birthday:</strong> <input type="text" class="edit-student-age" value="${student.age || ''}"></p>
                                <p><strong>Grade:</strong> <input type="text" class="edit-student-grade" value="${student.grade || ''}"></p>
                                <p><strong>Occupation:</strong> <input type="text" class="edit-student-occupation" value="${student.occupation || ''}"></p>
                                <p><strong>Days and Times:</strong> <input type="text" class="edit-student-days-and-times" value="${student.days_and_times || ''}"></p>
                                <p><strong>ESL Level:</strong> <input type="text" class="edit-student-esl-level" value="${student.esl_level || ''}"></p>
                                <button class="save-student-info-button" data-student-id="${student.id}">Save Student Info</button>
                                <div>
                                    <strong>Teacher Comments:</strong>
                                    <textarea class="teacher-comments" data-student-id="${student.id}" rows="4">${student.teacher_comments || ''}</textarea>
                                    <button class="save-comment-button" data-student-id="${student.id}">Save Comment</button>
                                </div>
                                <div>
                                    <strong>Lessons & Links:</strong>
                                    <button class="add-link-button" data-student-id="${student.id}" data-current-links='${student.google_docs_links || '[]'}'>Add Link</button>
                                    <button class="create-lesson-button" data-student-id="${student.id}" data-student-name="${student.name}">Create Lesson</button>
                                    <div class="display-google-docs-links">${googleDocsDisplayHtml}</div>
                                </div>
                                <button class="view-vocab-button" data-student-id="${student.id}">View Vocabulary</button>
                                <div class="vocabulary-list" id="vocab-list-${student.id}" style="display: none;"></div>
                            </div>
                        `;
                        studentsContainer.appendChild(studentCard);
                    });
                    addEventListeners();
                }
            })
            .catch(error => {
                console.error('Error fetching students:', error);
            });
    }

    function addEventListeners() {
        document.querySelectorAll('.student-card-header').forEach(header => {
            header.addEventListener('click', (event) => {
                const clickedCard = event.target.closest('.student-card');
                const clickedContent = clickedCard.querySelector('.student-card-content');
                document.querySelectorAll('.student-card-content').forEach(content => {
                    if (content !== clickedContent && content.style.display === 'block') {
                        content.style.display = 'none';
                    }
                });
                clickedContent.style.display = clickedContent.style.display === 'block' ? 'none' : 'block';
            });
        });

        document.querySelectorAll('.view-vocab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                const vocabListDiv = document.getElementById(`vocab-list-${studentId}`);
                toggleVocabularyList(studentId, vocabListDiv);
            });
        });

        document.querySelectorAll('.save-comment-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                const commentText = document.querySelector(`.teacher-comments[data-student-id="${studentId}"]`).value;
                updateStudent(studentId, { teacher_comments: commentText });
            });
        });

        document.querySelectorAll('.save-student-info-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                const studentCard = event.target.closest('.student-card');
                const updatedInfo = {
                    name: studentCard.querySelector('.edit-student-name').value,
                    age: studentCard.querySelector('.edit-student-age').value,
                    grade: studentCard.querySelector('.edit-student-grade').value,
                    occupation: studentCard.querySelector('.edit-student-occupation').value,
                    days_and_times: studentCard.querySelector('.edit-student-days-and-times').value,
                    esl_level: studentCard.querySelector('.edit-student-esl-level').value,
                };
                updateStudent(studentId, updatedInfo);
            });
        });

        document.querySelectorAll('.add-link-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                currentStudentGoogleDocsLinks = event.target.dataset.currentLinks;
                modalStudentId.value = studentId;
                linkNameInput.value = '';
                linkUrlInput.value = '';
                addLinkModal.style.display = 'block';
            });
        });

        document.querySelectorAll('.create-lesson-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                const studentName = event.target.dataset.studentName;
                lessonModalStudentId.value = studentId;
                document.querySelector('#create-lesson-modal h2').textContent = `Create a New Lesson for ${studentName}`;
                startWordRankInput.value = '';
                numWordsInput.value = '';
                createLessonModal.style.display = 'block';
            });
        });

        closeButton.addEventListener('click', () => {
            addLinkModal.style.display = 'none';
        });

        closeLessonModalButton.addEventListener('click', () => {
            createLessonModal.style.display = 'none';
        });

        saveLinkButton.addEventListener('click', () => {
            const studentId = modalStudentId.value;
            const linkName = linkNameInput.value.trim();
            const linkUrl = linkUrlInput.value.trim();

            if (linkName && linkUrl) {
                const newLink = { name: linkName, url: linkUrl };
                let existingLinks = [];
                try {
                    existingLinks = JSON.parse(currentStudentGoogleDocsLinks);
                } catch (e) {
                    // If parsing fails, start with an empty array
                }
                const updatedLinks = JSON.stringify([...existingLinks, newLink]);
                updateStudent(studentId, { google_docs_links: updatedLinks });
                addLinkModal.style.display = 'none';
            } else {
                alert('Please enter both Name of Lesson and Link.');
            }
        });

        generateLessonButton.addEventListener('click', () => {
            const studentId = lessonModalStudentId.value;
            const studentName = document.querySelector(`.student-card[data-student-id="${studentId}"] .student-card-header`).textContent;
            const startWordRank = startWordRankInput.value;
            const numWords = numWordsInput.value;

            if (startWordRank && numWords) {
                fetch('/api/lessons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: studentId,
                        student_name: studentName,
                        start_word_rank: startWordRank,
                        num_words: numWords
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'success') {
                        createLessonModal.style.display = 'none';
                        fetchAndDisplayStudents();
                    } else {
                        alert(`Error: ${data.error}`);
                    }
                });
            } else {
                alert('Please fill in all fields.');
            }
        });

        window.addEventListener('click', (event) => {
            if (event.target === addLinkModal) {
                addLinkModal.style.display = 'none';
            }
            if (event.target === createLessonModal) {
                createLessonModal.style.display = 'none';
            }
        });
    }

    function toggleVocabularyList(studentId, vocabListDiv) {
        if (vocabListDiv.style.display === 'block') {
            vocabListDiv.style.display = 'none';
            vocabListDiv.innerHTML = '';
        } else {
            fetch(`/api/students/${studentId}/vocabulary`)
                .then(response => response.json())
                .then(vocabData => {
                    renderVocabularyList(vocabListDiv, vocabData.data, studentId);
                    vocabListDiv.style.display = 'block';
                });
        }
    }

    function renderVocabularyList(container, vocabData, studentId) {
        container.innerHTML = '<h4>Vocabulary</h4>';
        if (vocabData.length === 0) {
            container.innerHTML += '<p>No vocabulary saved yet.</p>';
        } else {
            const ul = document.createElement('ul');
            vocabData.forEach(item => {
                const li = document.createElement('li');
                li.dataset.vocabId = item.id;
                li.innerHTML = `
                    <span class="vocab-text">${item.word} - ${item.translation}</span>
                    <input type="text" class="edit-vocab-word" value="${item.word}" style="display:none;">
                    <input type="text" class="edit-vocab-translation" value="${item.translation}" style="display:none;">
                    <button class="edit-vocab-button">Edit</button>
                    <button class="save-vocab-button" style="display:none;">Save</button>
                    <button class="delete-vocab-button">Delete</button>
                `;
                ul.appendChild(li);
            });
            container.appendChild(ul);
            addVocabButtonListeners(container, studentId);
        }
    }

    function addVocabButtonListeners(container, studentId) {
        container.querySelectorAll('.edit-vocab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const li = event.target.closest('li');
                li.querySelector('.vocab-text').style.display = 'none';
                li.querySelector('.edit-vocab-word').style.display = 'inline-block';
                li.querySelector('.edit-vocab-translation').style.display = 'inline-block';
                li.querySelector('.edit-vocab-button').style.display = 'none';
                li.querySelector('.save-vocab-button').style.display = 'inline-block';
            });
        });

        container.querySelectorAll('.save-vocab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const li = event.target.closest('li');
                const vocabId = li.dataset.vocabId;
                const word = li.querySelector('.edit-vocab-word').value;
                const translation = li.querySelector('.edit-vocab-translation').value;

                fetch(`/api/vocabulary/${vocabId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word, translation })
                }).then(() => {
                    const vocabListDiv = document.getElementById(`vocab-list-${studentId}`);
                    toggleVocabularyList(studentId, vocabListDiv);
                    toggleVocabularyList(studentId, vocabListDiv);
                });
            });
        });

        container.querySelectorAll('.delete-vocab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const li = event.target.closest('li');
                const vocabId = li.dataset.vocabId;

                fetch(`/api/vocabulary/${vocabId}`, { method: 'DELETE' })
                .then(() => {
                    li.remove();
                });
            });
        });
    }

    function updateStudent(studentId, data) {
        fetch(`/api/students/${studentId}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if(data.message === 'success') {
                fetchAndDisplayStudents();
            }
        });
    }

    fetchAndDisplayStudents();
});
