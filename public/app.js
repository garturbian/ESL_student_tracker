document.addEventListener('DOMContentLoaded', () => {
    console.log('app.js: DOMContentLoaded event fired.');
    const studentsContainer = document.getElementById('students-container');

    // Modal elements
    const addLinkModal = document.getElementById('add-link-modal');
    const closeButton = document.querySelector('.close-button');
    const saveLinkButton = document.getElementById('save-link-button');
    const modalStudentId = document.getElementById('modal-student-id');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');

    let currentStudentGoogleDocsLinks = ''; // To hold the current links for the student being edited

    function fetchAndDisplayStudents() {
        console.log('app.js: fetchAndDisplayStudents called.');
        studentsContainer.innerHTML = ''; // Clear existing students
        fetch('/api/students')
            .then(response => {
                console.log('app.js: Received response from /api/students', response);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('app.js: Data received from /api/students', data);
                if (data.data && data.data.length > 0) {
                    data.data.forEach(student => {
                        console.log('app.js: Processing student:', student.name);
                        // Parse Google Docs links for display
                        let googleDocsDisplayHtml = '';
                        if (student.google_docs_links) {
                            const links = student.google_docs_links.split('\n').filter(link => link.trim() !== '');
                            googleDocsDisplayHtml = '<ul>';
                            links.forEach(linkLine => {
                                const parts = linkLine.split('|').map(s => s.trim());
                                if (parts.length === 2) {
                                    const text = parts[0];
                                    const url = parts[1];
                                    googleDocsDisplayHtml += `<li><a href="${url}" target="_blank">${text}</a> <button class="delete-link-button" data-student-id="${student.id}" data-link="${linkLine}">Delete</button></li>`;
                                } else {
                                    googleDocsDisplayHtml += `<li>${linkLine} <button class="delete-link-button" data-student-id="${student.id}" data-link="${linkLine}">Delete</button></li>`; // Fallback if format is incorrect
                                }
                            });
                            googleDocsDisplayHtml += '</ul>';
                        }

                        // Populate student cards
                        const studentCard = document.createElement('div');
                        studentCard.classList.add('student-card');
                        studentCard.dataset.studentId = student.id; // Add student ID to the card itself
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
                                    <strong>Google Docs Links:</strong>
                                    <button class="add-link-button" data-student-id="${student.id}" data-current-links="${student.google_docs_links || ''}">Add Link</button>
                                    <div class="display-google-docs-links">${googleDocsDisplayHtml}</div>
                                </div>
                                <button class="view-vocab-button" data-student-id="${student.id}">View Vocabulary</button>
                                <div class="vocabulary-list" id="vocab-list-${student.id}" style="display: none;"></div>
                            </div>
                        `;
                        studentsContainer.appendChild(studentCard);
                    });

                    // Add event listeners to the new buttons
                    addEventListeners();
                } else {
                    console.log('app.js: No student data received or data.data is empty.');
                }
            })
            .catch(error => {
                console.error('app.js: Error fetching students:', error);
            });
    }

    function addEventListeners() {
        // Accordion logic
        document.querySelectorAll('.student-card-header').forEach(header => {
            header.addEventListener('click', (event) => {
                const clickedCard = event.target.closest('.student-card');
                const clickedContent = clickedCard.querySelector('.student-card-content');

                // Collapse all other cards
                document.querySelectorAll('.student-card-content').forEach(content => {
                    if (content !== clickedContent && content.style.display === 'block') {
                        content.style.display = 'none';
                    }
                });

                // Toggle clicked card
                if (clickedContent.style.display === 'block') {
                    clickedContent.style.display = 'none';
                } else {
                    clickedContent.style.display = 'block';
                }
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

        // Add Link button click handler
        document.querySelectorAll('.add-link-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                currentStudentGoogleDocsLinks = event.target.dataset.currentLinks; // Store current links
                modalStudentId.value = studentId;
                linkNameInput.value = '';
                linkUrlInput.value = '';
                addLinkModal.style.display = 'block';
            });
        });

        // Close modal button
        closeButton.addEventListener('click', () => {
            addLinkModal.style.display = 'none';
        });

        // Save Link button in modal
        saveLinkButton.addEventListener('click', () => {
            const studentId = modalStudentId.value;
            const linkName = linkNameInput.value.trim();
            const linkUrl = linkUrlInput.value.trim();

            if (linkName && linkUrl) {
                const newLinkEntry = `${linkName} | ${linkUrl}`;
                let updatedLinks = currentStudentGoogleDocsLinks;
                if (updatedLinks) {
                    updatedLinks += `\n${newLinkEntry}`;
                } else {
                    updatedLinks = newLinkEntry;
                }
                updateStudent(studentId, { google_docs_links: updatedLinks });
                addLinkModal.style.display = 'none';
            } else {
                alert('Please enter both Name of Lesson and Link.');
            }
        });

        // Close modal if clicked outside
        window.addEventListener('click', (event) => {
            if (event.target === addLinkModal) {
                addLinkModal.style.display = 'none';
            }
        });

        // Add event listener for delete link buttons
        document.querySelectorAll('.delete-link-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const studentId = event.target.dataset.studentId;
                const linkToDelete = event.target.dataset.link;
                deleteLink(studentId, linkToDelete);
            });
        });
    }

    function deleteLink(studentId, linkToDelete) {
        // Fetch the current student data to get the full list of links
        fetch(`/api/students`)
            .then(response => response.json())
            .then(data => {
                const student = data.data.find(s => s.id == studentId);
                if (student && student.google_docs_links) {
                    const links = student.google_docs_links.split('\n').filter(link => link.trim() !== '');
                    const updatedLinks = links.filter(link => link !== linkToDelete).join('\n');
                    updateStudent(studentId, { google_docs_links: updatedLinks });
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
                    toggleVocabularyList(studentId, vocabListDiv); // Close
                    toggleVocabularyList(studentId, vocabListDiv); // Re-open to refresh
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
                fetchAndDisplayStudents(); // Re-fetch and display all students to update the card
            }
        });
    }

    fetchAndDisplayStudents();
});