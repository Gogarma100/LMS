export const usersPage = async (container) => {
    const token = localStorage.getItem('accessToken');
    container.innerHTML = `
        <div class="dashboard-container">
            <header class="dashboard-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 2rem;">
                <div>
                    <h1 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; letter-spacing: -0.05em; line-height: 1;">User Management</h1>
                    <p style="color: #64748b; font-size: 1.125rem; margin-top: 0.5rem; font-weight: 500;">Manage user roles and permissions</p>
                </div>
            </header>

            <div id="usersList" style="background: white; border-radius: 1rem; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="padding: 1rem; background: #f8fafc; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 2fr 1fr 1fr; font-weight: 600; font-size: 0.875rem; color: #64748b;">
                    <div>Email</div>
                    <div>Current Role</div>
                    <div>Actions</div>
                </div>
                <div id="usersGrid">
                    <div style="padding: 2rem; text-align: center; color: #64748b;">Loading users...</div>
                </div>
            </div>
        </div>
    `;

    const usersGrid = container.querySelector('#usersGrid');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const users = await res.json();
                renderUsers(users);
            } else {
                usersGrid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Failed to load users. Admin access required.</div>';
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            usersGrid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error connecting to server.</div>';
        }
    };

    const renderUsers = (users) => {
        if (users.length === 0) {
            usersGrid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">No users found.</div>';
            return;
        }

        usersGrid.innerHTML = users.map(user => `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 2fr 1fr 1fr; align-items: center; font-size: 0.875rem;">
                <div style="font-weight: 500;">${user.email}</div>
                <div>
                    <span style="padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: ${user.role === 'admin' ? '#fee2e2' : user.role === 'instructor' ? '#dcfce7' : '#f1f5f9'}; color: ${user.role === 'admin' ? '#ef4444' : user.role === 'instructor' ? '#10b981' : '#64748b'}; text-transform: uppercase;">
                        ${user.role}
                    </span>
                </div>
                <div>
                    <select class="role-select" data-id="${user.id}" style="padding: 0.25rem; border: 1px solid var(--border); border-radius: 0.375rem; font-size: 0.75rem;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="instructor" ${user.role === 'instructor' ? 'selected' : ''}>Instructor</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </div>
        `).join('');

        usersGrid.querySelectorAll('.role-select').forEach(select => {
            select.onchange = async (e) => {
                const userId = e.target.dataset.id;
                const newRole = e.target.value;
                
                try {
                    const res = await fetch(`/api/admin/users/${userId}/role`, {
                        method: 'PUT',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ role: newRole })
                    });
                    
                    if (res.ok) {
                        fetchUsers(); // Refresh list
                    } else {
                        alert('Failed to update role');
                        fetchUsers(); // Revert UI
                    }
                } catch (err) {
                    console.error('Error updating role:', err);
                    alert('Error connecting to server');
                    fetchUsers();
                }
            };
        });
    };

    fetchUsers();
};
