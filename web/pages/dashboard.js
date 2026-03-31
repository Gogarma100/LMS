import { showCourseModal } from '../components/CourseModal.js';
import { showProgressModal } from '../components/ProgressModal.js';
import { showEnrolledUsersModal } from '../components/EnrolledUsersModal.js';

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
                        showProgressModal(id, currentProgress, token, fetchCourses);
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
                            showCourseModal({ id, title, description: desc }, token, fetchCourses);
                        };
                    });

                    grid.querySelectorAll('.view-users-btn').forEach(btn => {
                        btn.onclick = async (e) => {
                            const id = e.target.closest('.course-card').dataset.id;
                            showEnrolledUsersModal(id, token);
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

    if (role === 'admin') {
        const addBtn = header.querySelector('#addCourseBtn');
        if (addBtn) addBtn.onclick = () => showCourseModal(null, token, fetchCourses);
    }

    fetchCourses();
};
