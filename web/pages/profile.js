import { navigate } from '../app.js';

export const profilePage = (container) => {
    const token = localStorage.getItem('accessToken');
    
    const div = document.createElement('div');
    div.className = 'profile-container';
    div.innerHTML = `
        <div class="auth-container" style="max-width: 500px; margin: 4rem auto;">
            <h2 style="text-align: left; margin-bottom: 2rem;">User Profile</h2>
            <div id="profileMessage" class="hidden"></div>
            <form id="profileForm">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="profileEmail" required placeholder="you@example.com">
                </div>
                <div class="form-group">
                    <label>User Role</label>
                    <select id="profileRole" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 0.625rem; font-size: 1rem; background: #f8fafc; cursor: pointer;">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 2.5rem;">
                    <button type="submit" id="saveBtn">Save Profile Changes</button>
                    <button type="button" id="backBtn" style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; box-shadow: none;">Back to Dashboard</button>
                </div>
            </form>
        </div>
    `;

    container.appendChild(div);

    const form = div.querySelector('#profileForm');
    const emailInput = div.querySelector('#profileEmail');
    const roleSelect = div.querySelector('#profileRole');
    const backBtn = div.querySelector('#backBtn');
    const saveBtn = div.querySelector('#saveBtn');
    const messageDiv = div.querySelector('#profileMessage');

    const showMessage = (text, type = 'error') => {
        messageDiv.innerText = text;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.classList.remove('hidden');
    };

    backBtn.onclick = () => navigate('dashboard');

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                emailInput.value = user.email;
                roleSelect.value = user.role;
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
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

    fetchProfile();
};
