import { navigate } from '../app.js';
import { generateCertificate } from '../services/CertificateService.js';

export const profilePage = (container) => {
    const token = localStorage.getItem('accessToken');
    
    const div = document.createElement('div');
    div.className = 'profile-container';
    div.innerHTML = `
        <div class="auth-container" style="max-width: 600px; margin: 4rem auto;">
            <h2 style="text-align: left; margin-bottom: 2rem;">User Profile</h2>
            <div id="profileMessage" class="hidden"></div>
            <form id="profileForm">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="profileEmail" required placeholder="you@example.com">
                </div>
                <div class="form-group">
                    <label>User Role</label>
                    <select id="profileRole" ${localStorage.getItem('userRole') !== 'admin' ? 'disabled' : ''} style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 0.625rem; font-size: 1rem; background: ${localStorage.getItem('userRole') !== 'admin' ? '#f1f5f9' : '#f8fafc'}; cursor: ${localStorage.getItem('userRole') !== 'admin' ? 'not-allowed' : 'pointer'};">
                        <option value="user">User</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                    </select>
                    ${localStorage.getItem('userRole') !== 'admin' ? '<p style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">Only administrators can change user roles.</p>' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 2.5rem;">
                    <button type="submit" id="saveBtn">Save Profile Changes</button>
                    <button type="button" id="backBtn" style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; box-shadow: none;">Back to Dashboard</button>
                </div>
            </form>

            <div id="certificatesSection" style="margin-top: 4rem; border-top: 2px solid #e2e8f0; padding-top: 2rem;">
                <h3 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 1.5rem;">My Certificates</h3>
                <div id="certificatesList" class="certificates-list">
                    <p style="color: #64748b;">Loading certificates...</p>
                </div>
            </div>
        </div>
    `;

    container.appendChild(div);

    const form = div.querySelector('#profileForm');
    const emailInput = div.querySelector('#profileEmail');
    const roleSelect = div.querySelector('#profileRole');
    const backBtn = div.querySelector('#backBtn');
    const saveBtn = div.querySelector('#saveBtn');
    const messageDiv = div.querySelector('#profileMessage');
    const certificatesList = div.querySelector('#certificatesList');

    const showMessage = (text, type = 'error') => {
        messageDiv.innerText = text;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.classList.remove('hidden');
    };

    backBtn.onclick = () => navigate('dashboard');

    const fetchProfileData = async () => {
        try {
            const [profileRes, progressRes] = await Promise.all([
                fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/courses/progress', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (profileRes.ok) {
                const user = await profileRes.json();
                emailInput.value = user.email;
                roleSelect.value = user.role;

                if (progressRes.ok) {
                    const progressList = await progressRes.json();
                    const completedCourses = progressList.filter(p => p.percentageComplete === 100);

                    if (completedCourses.length > 0) {
                        certificatesList.innerHTML = completedCourses.map(p => `
                            <div class="certificate-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; margin-bottom: 1rem;">
                                <div>
                                    <h4 style="font-weight: 700; color: #1e293b;">${p.course.title}</h4>
                                    <p style="font-size: 0.875rem; color: #64748b;">Completed on ${new Date(p.updatedAt).toLocaleDateString()}</p>
                                </div>
                                <button class="download-cert-btn btn-small" data-course="${p.course.title}" data-date="${new Date(p.updatedAt).toLocaleDateString()}" style="width: auto; background: #2563eb; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;">
                                    Download PDF
                                </button>
                            </div>
                        `).join('');

                        certificatesList.querySelectorAll('.download-cert-btn').forEach(btn => {
                            btn.onclick = () => {
                                generateCertificate(emailInput.value, btn.dataset.course, btn.dataset.date);
                            };
                        });
                    } else {
                        certificatesList.innerHTML = '<p style="color: #64748b;">Complete a course to earn your first certificate!</p>';
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch profile data', err);
            certificatesList.innerHTML = '<p style="color: #ef4444;">Error loading certificates.</p>';
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        messageDiv.classList.add('hidden');
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        try {
            const res = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    role: roleSelect.value
                })
            });

            if (res.ok) {
                showMessage('Profile updated successfully!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const data = await res.json();
                showMessage(data.message || 'Update failed');
                saveBtn.disabled = false;
                saveBtn.innerText = 'Save Profile Changes';
            }
        } catch (err) {
            showMessage('Server connection error');
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Profile Changes';
        }
    };

    fetchProfileData();
};
