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
            ${(role === 'admin' || role === 'instructor') ? '<button id="addCourseBtn" style="width: auto; padding: 0.875rem 1.75rem; background: #2563eb; color: white; border-radius: 0.75rem; font-weight: 700; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">+ Create New Course</button>' : ''}
        </div>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'dashboard-content';
    grid.innerHTML = '<p>Loading courses...</p>';
    container.appendChild(grid);

    const fetchCourses = async () => {
        try {
            // Fetch all courses, user's enrolled courses, progress, and teaching courses
            const requests = [
                fetch('/api/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/auth/me/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/courses/progress', { headers: { 'Authorization': `Bearer ${token}` } })
            ];

            if (role === 'instructor') {
                requests.push(fetch('/api/auth/me/teaching', { headers: { 'Authorization': `Bearer ${token}` } }));
            }

            const responses = await Promise.all(requests);
            
            if (responses.every(res => res.ok)) {
                const courses = await responses[0].json();
                const enrolledCourses = await responses[1].json();
                const progressList = await responses[2].json();
                const teachingCourses = role === 'instructor' ? await responses[3].json() : [];

                const enrolledIds = enrolledCourses.map(c => c.id);
                const teachingIds = teachingCourses.map(c => c.id);
                const progressMap = progressList.reduce((acc, p) => {
                    acc[p.course.id] = p;
                    return acc;
                }, {});

                const renderCourseCard = (course) => {
                    const isEnrolled = enrolledIds.includes(course.id);
                    const isTeaching = teachingIds.includes(course.id);
                    const progress = progressMap[course.id] || { percentageComplete: 0 };
                    
                    return `
                        <div class="course-card" data-id="${course.id}" style="${isTeaching ? 'border-top: 4px solid #6366f1;' : ''}">
                            <div class="course-card-content">
                                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    ${isTeaching ? '<span class="badge badge-teaching">TEACHING</span>' : ''}
                                    ${isEnrolled ? '<span class="badge badge-enrolled">ENROLLED</span>' : ''}
                                    ${role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : ''}
                                </div>
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
                                    ${(role === 'admin' || isTeaching) ? `
                                        <button class="edit-btn btn-small btn-edit">Edit</button>
                                    ` : ''}
                                    ${role === 'admin' ? `
                                        <button class="delete-btn btn-small btn-delete">Delete</button>
                                        <button class="view-users-btn btn-small btn-view">Users</button>
                                    ` : ''}
                                    ${!isTeaching ? `
                                        <button class="enroll-btn btn-small ${isEnrolled ? 'btn-unenroll' : 'btn-enroll'}">
                                            ${isEnrolled ? 'Unenroll' : 'Enroll Now'}
                                        </button>
                                    ` : ''}
                                    ${isEnrolled ? `
                                        <button class="update-progress-btn btn-small btn-progress">Update</button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                };

                let html = '';

                if (role === 'instructor' && teachingCourses.length > 0) {
                    html += `
                        <section style="margin-bottom: 3rem;">
                            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span style="width: 8px; height: 24px; background: #6366f1; border-radius: 4px;"></span>
                                Courses You're Teaching
                            </h2>
                            <div class="course-grid">
                                ${teachingCourses.map(renderCourseCard).join('')}
                            </div>
                        </section>
                    `;
                }

                const enrolledList = courses.filter(c => enrolledIds.includes(c.id));
                if (enrolledList.length > 0) {
                    html += `
                        <section style="margin-bottom: 3rem;">
                            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span style="width: 8px; height: 24px; background: #10b981; border-radius: 4px;"></span>
                                Your Learning Journey
                            </h2>
                            <div class="course-grid">
                                ${enrolledList.map(renderCourseCard).join('')}
                            </div>
                        </section>
                    `;
                }

                const availableList = courses.filter(c => !enrolledIds.includes(c.id) && !teachingIds.includes(c.id));
                if (availableList.length > 0 || (enrolledList.length === 0 && teachingCourses.length === 0)) {
                    html += `
                        <section>
                            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span style="width: 8px; height: 24px; background: #2563eb; border-radius: 4px;"></span>
                                Explore New Courses
                            </h2>
                            <div class="course-grid">
                                ${availableList.length > 0 ? availableList.map(renderCourseCard).join('') : '<p style="color: #64748b; padding: 2rem; text-align: center; background: white; border-radius: 1rem; border: 1px dashed var(--border); width: 100%;">No other courses available at the moment.</p>'}
                            </div>
                        </section>
                    `;
                }

                grid.innerHTML = html;

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

                if (role === 'admin' || role === 'instructor') {
                    grid.querySelectorAll('.edit-btn').forEach(btn => {
                        btn.onclick = async (e) => {
                            const card = e.target.closest('.course-card');
                            const id = card.dataset.id;
                            
                            // Fetch full course details including modules
                            try {
                                const res = await fetch(`/api/courses/${id}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                    const fullCourse = await res.json();
                                    showCourseModal(fullCourse, token, fetchCourses);
                                } else {
                                    alert('Failed to fetch course details');
                                }
                            } catch (err) {
                                console.error('Error fetching course details', err);
                                alert('Error connecting to server');
                            }
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

                        grid.querySelectorAll('.view-users-btn').forEach(btn => {
                            btn.onclick = async (e) => {
                                const id = e.target.closest('.course-card').dataset.id;
                                showEnrolledUsersModal(id, token);
                            };
                        });
                    }
                }
            } else {
                grid.innerHTML = '<p>Failed to load courses. Please login again.</p>';
            }
        } catch (err) {
            grid.innerHTML = '<p>Error connecting to server.</p>';
        }
    };

    if (role === 'admin' || role === 'instructor') {
        const addBtn = header.querySelector('#addCourseBtn');
        if (addBtn) addBtn.onclick = () => showCourseModal(null, token, fetchCourses);
    }

    fetchCourses();
};
