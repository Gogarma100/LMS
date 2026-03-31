import { showCourseModal } from '../components/CourseModal.js';
import { showProgressModal } from '../components/ProgressModal.js';
import { showEnrolledUsersModal } from '../components/EnrolledUsersModal.js';

export const dashboardPage = async (container) => {
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('accessToken');

    const header = document.createElement('div');
    header.className = 'dashboard-header';
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 2rem;">
            <div>
                <h1 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; letter-spacing: -0.05em; line-height: 1;">Learning Dashboard</h1>
                <p style="color: #64748b; font-size: 1.125rem; margin-top: 0.5rem; font-weight: 500;">Track your progress and discover new skills.</p>
            </div>
            ${role === 'admin' ? '<button id="addCourseBtn" style="width: auto; padding: 0.875rem 1.75rem; background: #2563eb; color: white; border-radius: 0.75rem; font-weight: 700; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">+ Create New Course</button>' : ''}
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
                            <div class="course-card-content">
                                ${role === 'admin' ? '<span class="badge badge-admin">Admin Mode</span>' : (isEnrolled ? '<span class="badge badge-enrolled">Enrolled</span>' : '')}
                                <h3>${course.title}</h3>
                                <p>${course.description}</p>
                                
                                ${isEnrolled ? `
                                    <div class="progress-section">
                                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: #64748b;">
                                            <span>Course Progress</span>
                                            <span>${progress.percentageComplete}%</span>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar-fill" style="width: ${progress.percentageComplete}%;"></div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="course-card-footer">
                                <div class="course-actions">
                                    ${role === 'admin' ? `
                                        <button class="edit-btn btn-small btn-edit">Edit</button>
                                        <button class="delete-btn btn-small btn-delete">Delete</button>
                                        <button class="view-users-btn btn-small btn-view">Users</button>
                                    ` : `
                                        <button class="enroll-btn btn-small ${isEnrolled ? 'btn-unenroll' : 'btn-enroll'}">
                                            ${isEnrolled ? 'Unenroll' : 'Enroll Now'}
                                        </button>
                                        ${isEnrolled ? `
                                            <button class="update-progress-btn btn-small btn-progress">Update</button>
                                        ` : ''}
                                    `}
                                </div>
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
