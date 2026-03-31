export const dashboardPage = async (container) => {
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('accessToken');

    const header = document.createElement('div');
    header.className = 'dashboard-header';
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1>Welcome back!</h1>
                <p class="text-muted">Explore your enrolled courses and continue learning.</p>
            </div>
            ${role === 'admin' ? '<button id="addCourseBtn" style="width: auto; padding: 0.5rem 1rem;">+ Add Course</button>' : ''}
        </div>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'course-grid';
    grid.innerHTML = '<p>Loading courses...</p>';
    container.appendChild(grid);

    const fetchCourses = async () => {
        try {
            // Fetch all courses, user's enrolled courses, and progress
            const [coursesRes, enrolledRes, progressRes] = await Promise.all([
                fetch('/api/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/auth/me/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/courses/progress', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (coursesRes.ok && enrolledRes.ok && progressRes.ok) {
                const courses = await coursesRes.json();
                const enrolledCourses = await enrolledRes.json();
                const progressList = await progressRes.json();

                const enrolledIds = enrolledCourses.map(c => c.id);
                const progressMap = progressList.reduce((acc, p) => {
                    acc[p.course.id] = p;
                    return acc;
                }, {});

                grid.innerHTML = courses.map(course => {
                    const isEnrolled = enrolledIds.includes(course.id);
                    const progress = progressMap[course.id] || { percentageComplete: 0 };
                    return `
                        <div class="course-card" data-id="${course.id}">
                            <h3>${course.title}</h3>
                            <p>${course.description}</p>
                            ${isEnrolled ? `
                                <div class="progress-container" style="margin: 1rem 0;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                                        <span>Progress</span>
                                        <span>${progress.percentageComplete}%</span>
                                    </div>
                                    <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                                        <div style="background: #10b981; height: 100%; width: ${progress.percentageComplete}%; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            ` : ''}
                            <div class="course-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${role === 'admin' ? `
                                    <button class="edit-btn" style="background: #f59e0b; font-size: 0.75rem; width: auto;">Edit</button>
                                    <button class="delete-btn" style="background: #ef4444; font-size: 0.75rem; width: auto;">Delete</button>
                                    <button class="view-users-btn" style="background: #3b82f6; font-size: 0.75rem; width: auto;">View Users</button>
                                ` : `
                                    <button class="enroll-btn" style="background: ${isEnrolled ? '#ef4444' : '#10b981'}; font-size: 0.75rem; width: auto;">
                                        ${isEnrolled ? 'Unenroll' : 'Enroll Now'}
                                    </button>
                                    ${isEnrolled ? `
                                        <button class="update-progress-btn" style="background: #6366f1; font-size: 0.75rem; width: auto;">Update Progress</button>
                                    ` : ''}
                                `}
                            </div>
                        </div>
                    `;
                }).join('');

                // Event Listeners
                grid.querySelectorAll('.enroll-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        const card = e.target.closest('.course-card');
                        const id = card.dataset.id;
                        const isEnrolled = e.target.innerText === 'Unenroll';
                        const method = isEnrolled ? 'DELETE' : 'POST';
                        const action = isEnrolled ? 'unenroll' : 'enroll';

                        const res = await fetch(`/api/courses/${id}/${action}`, {
                            method,
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (res.ok) fetchCourses();
                        else alert(`Failed to ${action}`);
                    };
                });

                grid.querySelectorAll('.update-progress-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const card = e.target.closest('.course-card');
                        const id = card.dataset.id;
                        const currentProgress = progressMap[id] ? progressMap[id].percentageComplete : 0;
                        showProgressModal(id, currentProgress);
                    };
                });

                if (role === 'admin') {
                    grid.querySelectorAll('.delete-btn').forEach(btn => {
                        btn.onclick = async (e) => {
                            const id = e.target.closest('.course-card').dataset.id;
                            if (confirm('Are you sure you want to delete this course?')) {
                                const delRes = await fetch(`/api/courses/${id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (delRes.ok) fetchCourses();
                            }
                        };
                    });

                    grid.querySelectorAll('.edit-btn').forEach(btn => {
                        btn.onclick = (e) => {
                            const card = e.target.closest('.course-card');
                            const id = card.dataset.id;
                            const title = card.querySelector('h3').innerText;
                            const desc = card.querySelector('p').innerText;
                            showCourseModal({ id, title, description: desc });
                        };
                    });

                    grid.querySelectorAll('.view-users-btn').forEach(btn => {
                        btn.onclick = async (e) => {
                            const id = e.target.closest('.course-card').dataset.id;
                            showEnrolledUsersModal(id);
                        };
                    });
                }
            } else {
                grid.innerHTML = '<p>Failed to load courses. Please login again.</p>';
            }
        } catch (err) {
            grid.innerHTML = '<p>Error connecting to server.</p>';
        }
    };

    const showProgressModal = (courseId, currentProgress) => {
        const modal = document.createElement('div');
        modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
        modal.innerHTML = `
            <div class="auth-container" style="margin: 0; width: 90%; max-width: 400px;">
                <h2>Update Progress</h2>
                <form id="progressForm">
                    <div class="form-group">
                        <label>Percentage Complete (${currentProgress}%)</label>
                        <input type="range" id="m-progress" min="0" max="100" value="${currentProgress}" style="width: 100%;">
                        <div style="text-align: center; font-weight: bold; margin-top: 0.5rem;" id="progressValue">${currentProgress}%</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit">Save</button>
                        <button type="button" id="closeProgressModal" style="background: #64748b;">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const rangeInput = modal.querySelector('#m-progress');
        const valueDisplay = modal.querySelector('#progressValue');
        rangeInput.oninput = () => {
            valueDisplay.innerText = `${rangeInput.value}%`;
        };

        modal.querySelector('#closeProgressModal').onclick = () => modal.remove();
        modal.querySelector('#progressForm').onsubmit = async (e) => {
            e.preventDefault();
            const percentageComplete = parseInt(rangeInput.value);

            const res = await fetch(`/api/courses/${courseId}/progress`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ percentageComplete })
            });

            if (res.ok) {
                modal.remove();
                fetchCourses();
            } else {
                alert('Failed to update progress');
            }
        };
    };

    const showEnrolledUsersModal = async (courseId) => {
        const modal = document.createElement('div');
        modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
        modal.innerHTML = `
            <div class="auth-container" style="margin: 0; width: 90%; max-width: 500px;">
                <h2>Enrolled Users</h2>
                <div id="usersList" style="margin: 1rem 0; max-height: 300px; overflow-y: auto;">
                    <p>Loading users...</p>
                </div>
                <button type="button" id="closeUsersModal" style="background: #64748b;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeUsersModal').onclick = () => modal.remove();

        try {
            const res = await fetch(`/api/courses/${courseId}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const users = await res.json();
                const list = modal.querySelector('#usersList');
                if (users.length === 0) {
                    list.innerHTML = '<p>No users enrolled yet.</p>';
                } else {
                    list.innerHTML = users.map(u => `
                        <div style="padding: 0.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                            <span>${u.email}</span>
                            <span style="font-size: 0.75rem; color: #64748b;">${u.role}</span>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            modal.querySelector('#usersList').innerHTML = '<p>Error loading users.</p>';
        }
    };

    const showCourseModal = (course = null) => {
        const modal = document.createElement('div');
        modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
        modal.innerHTML = `
            <div class="auth-container" style="margin: 0; width: 90%; max-width: 500px;">
                <h2>${course ? 'Edit Course' : 'Add New Course'}</h2>
                <form id="courseForm">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="m-title" value="${course ? course.title : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="m-desc" style="width: 100%; padding: 0.625rem; border: 1px solid var(--border); border-radius: 0.375rem; min-height: 100px;">${course ? course.description : ''}</textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit">Save</button>
                        <button type="button" id="closeModal" style="background: #64748b;">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeModal').onclick = () => modal.remove();
        modal.querySelector('#courseForm').onsubmit = async (e) => {
            e.preventDefault();
            const title = modal.querySelector('#m-title').value;
            const description = modal.querySelector('#m-desc').value;

            const method = course ? 'PUT' : 'POST';
            const url = course ? `/api/courses/${course.id}` : '/api/courses';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description })
            });

            if (res.ok) {
                modal.remove();
                fetchCourses();
            } else {
                alert('Failed to save course');
            }
        };
    };

    if (role === 'admin') {
        const addBtn = header.querySelector('#addCourseBtn');
        if (addBtn) addBtn.onclick = () => showCourseModal();
    }

    fetchCourses();
};
