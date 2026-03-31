import { navigate } from '../app.js';

export const profilePage = (container) => {
    const token = localStorage.getItem('accessToken');
    
    const div = document.createElement('div');
    div.className = 'profile-container';
    div.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 2rem auto;">
            <h2 style="margin-bottom: 1.5rem;">User Profile</h2>
            <form id="profileForm">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="profileEmail" required>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="profileRole">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button type="submit" class="btn-primary">Save Changes</button>
                    <button type="button" id="backBtn" class="btn-secondary">Back to Dashboard</button>
                </div>
            </form>
        </div>
    `;

    container.appendChild(div);

    const form = div.querySelector('#profileForm');
    const emailInput = div.querySelector('#profileEmail');
    const roleSelect = div.querySelector('#profileRole');
    const backBtn = div.querySelector('#backBtn');

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
                alert('Profile updated successfully!');
                // Reload to update navbar etc
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.message || 'Update failed');
            }
        } catch (err) {
            alert('Server connection error');
        }
    };

    fetchProfile();
};
