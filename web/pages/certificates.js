import { navigate } from '../app.js';
import { generateCertificate } from '../services/CertificateService.js';

export const certificatesPage = (container) => {
    const token = localStorage.getItem('accessToken');
    
    const div = document.createElement('div');
    div.className = 'certificates-container';
    div.innerHTML = `
        <div class="dashboard-header" style="margin-bottom: 3rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 2rem;">
            <h1 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; letter-spacing: -0.05em; line-height: 1;">My Certificates</h1>
            <p style="color: #64748b; font-size: 1.125rem; margin-top: 0.5rem; font-weight: 500;">Your earned achievements and course completions.</p>
        </div>
        <div id="certificatesList" class="certificates-list" style="max-width: 800px; margin: 0 auto;">
            <p style="color: #64748b;">Loading your certificates...</p>
        </div>
        <div style="margin-top: 3rem; text-align: center;">
            <button id="backBtn" style="width: auto; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; box-shadow: none; padding: 0.75rem 2rem;">Back to Dashboard</button>
        </div>
    `;

    container.appendChild(div);

    const certificatesList = div.querySelector('#certificatesList');
    const backBtn = div.querySelector('#backBtn');

    backBtn.onclick = () => navigate('dashboard');

    const fetchCertificates = async () => {
        try {
            const [profileRes, progressRes] = await Promise.all([
                fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/courses/progress', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (profileRes.ok && progressRes.ok) {
                const user = await profileRes.json();
                const progressList = await progressRes.json();
                const completedCourses = progressList.filter(p => p.percentageComplete === 100);

                if (completedCourses.length > 0) {
                    certificatesList.innerHTML = completedCourses.map(p => `
                        <div class="certificate-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: transform 0.2s;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 9999px; text-transform: uppercase;">Verified</span>
                                    <span style="color: #64748b; font-size: 0.875rem;">ID: CERT-${p.id}</span>
                                </div>
                                <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem;">${p.course.title}</h3>
                                <p style="color: #64748b; font-size: 0.875rem;">Completed on ${new Date(p.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <button class="download-cert-btn" data-course="${p.course.title}" data-date="${new Date(p.updatedAt).toLocaleDateString()}" style="width: auto; background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700;">
                                Download PDF
                            </button>
                        </div>
                    `).join('');

                    certificatesList.querySelectorAll('.download-cert-btn').forEach(btn => {
                        btn.onclick = () => {
                            generateCertificate(user.email, btn.dataset.course, btn.dataset.date);
                        };
                    });
                } else {
                    certificatesList.innerHTML = `
                        <div style="text-align: center; padding: 4rem 2rem; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 1.5rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>
                            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">No certificates yet</h3>
                            <p style="color: #64748b; margin-bottom: 2rem;">Complete your first course to earn a verified certificate of completion.</p>
                            <button onclick="window.navigate('dashboard')" style="width: auto; background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700;">Browse Courses</button>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error('Failed to fetch certificates', err);
            certificatesList.innerHTML = '<p style="color: #ef4444;">Error loading certificates. Please try again later.</p>';
        }
    };

    fetchCertificates();
};
