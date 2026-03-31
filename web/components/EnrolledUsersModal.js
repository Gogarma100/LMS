export const showEnrolledUsersModal = async (courseId, token) => {
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
