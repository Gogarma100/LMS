import { navigate } from '../app.js';

export const loginPage = (container, isRegister = false) => {
    const div = document.createElement('div');
    div.className = 'auth-container';
    div.innerHTML = `
        <h2>${isRegister ? 'Create Account' : 'Login to Kokostream'}</h2>
        <form id="authForm">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" required placeholder="you@example.com">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" required placeholder="••••••••">
            </div>
            <button type="submit">${isRegister ? 'Register' : 'Login'}</button>
        </form>
        <div class="toggle-auth">
            ${isRegister 
                ? 'Already have an account? <a id="toggleLink">Login</a>' 
                : 'New to Kokostream? <a id="toggleLink">Register</a>'}
        </div>
    `;

    container.appendChild(div);

    const form = div.querySelector('#authForm');
    const toggleLink = div.querySelector('#toggleLink');

    toggleLink.onclick = () => navigate(isRegister ? 'login' : 'register');

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = div.querySelector('#email').value;
        const password = div.querySelector('#password').value;

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                if (isRegister) {
                    alert('Registration successful! Please login.');
                    navigate('login');
                } else {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('userRole', data.role);
                    // The full snapshot will be fetched by app.js on navigation
                    navigate('dashboard');
                }
            } else {
                alert(data.message || 'Authentication failed');
            }
        } catch (err) {
            alert('Server connection error');
        }
    };
};
