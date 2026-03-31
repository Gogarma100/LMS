import { navigate } from '../app.js';

export const loginPage = (container, isRegister = false) => {
    const div = document.createElement('div');
    div.className = 'auth-container';
    div.innerHTML = `
        <h2>${isRegister ? 'Create Account' : 'Login to Kokostream'}</h2>
        <div id="message" class="hidden"></div>
        <form id="authForm">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" required placeholder="you@example.com">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" required placeholder="••••••••">
            </div>
            <button type="submit" id="submitBtn">${isRegister ? 'Register' : 'Login'}</button>
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
    const messageDiv = div.querySelector('#message');
    const submitBtn = div.querySelector('#submitBtn');

    const showMessage = (text, type = 'error') => {
        messageDiv.innerText = text;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.classList.remove('hidden');
    };

    toggleLink.onclick = () => navigate(isRegister ? 'login' : 'register');

    form.onsubmit = async (e) => {
        e.preventDefault();
        messageDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerText = isRegister ? 'Registering...' : 'Logging in...';

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
                    showMessage('Registration successful! Redirecting to login...', 'success');
                    setTimeout(() => navigate('login'), 1500);
                } else {
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('userRole', data.role);
                    navigate('dashboard');
                }
            } else {
                if (res.status === 503) {
                    showMessage('Database is initializing. Please wait a few seconds and try again.');
                } else {
                    showMessage(data.message || 'Authentication failed');
                }
                submitBtn.disabled = false;
                submitBtn.innerText = isRegister ? 'Register' : 'Login';
            }
        } catch (err) {
            showMessage('Server connection error. Please check if the backend is running.');
            submitBtn.disabled = false;
            submitBtn.innerText = isRegister ? 'Register' : 'Login';
        }
    };
};
