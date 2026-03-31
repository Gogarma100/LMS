import { navigate } from '../app.js';

export const forgotPasswordPage = (container) => {
    const div = document.createElement('div');
    div.className = 'auth-container';
    div.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px;">
            <h2 style="font-size: 1.875rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; text-align: center;">Forgot Password?</h2>
            <p style="color: #64748b; text-align: center; margin-bottom: 2rem;">Enter your email to receive a password reset link.</p>
            
            <div id="message" class="hidden" style="padding: 1rem; border-radius: 0.75rem; margin-bottom: 1.5rem; font-size: 0.875rem;"></div>
            
            <form id="forgotForm">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Email Address</label>
                    <input type="email" id="email" required placeholder="you@example.com" 
                        style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; font-family: inherit; transition: border-color 0.2s;">
                </div>
                <button type="submit" id="submitBtn" 
                    style="width: 100%; background: #6366f1; color: white; padding: 0.75rem; border-radius: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: background 0.2s;">
                    Send Reset Link
                </button>
            </form>
            
            <div style="margin-top: 1.5rem; text-align: center;">
                <a id="backToLogin" style="color: #6366f1; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: none;">Back to Login</a>
            </div>
        </div>
    `;

    container.appendChild(div);

    const form = div.querySelector('#forgotForm');
    const messageDiv = div.querySelector('#message');
    const submitBtn = div.querySelector('#submitBtn');
    const backToLogin = div.querySelector('#backToLogin');

    backToLogin.onclick = () => navigate('login');

    const showMessage = (text, type = 'error') => {
        messageDiv.innerText = text;
        messageDiv.style.display = 'block';
        if (type === 'error') {
            messageDiv.style.background = '#fef2f2';
            messageDiv.style.color = '#991b1b';
            messageDiv.style.border = '1px solid #fee2e2';
        } else {
            messageDiv.style.background = '#f0fdf4';
            messageDiv.style.color = '#166534';
            messageDiv.style.border = '1px solid #dcfce7';
        }
        messageDiv.classList.remove('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        messageDiv.classList.add('hidden');
        messageDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerText = 'Sending...';

        const email = div.querySelector('#email').value;

        try {
            const res = await fetch('/api/auth/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                showMessage(data.message, 'success');
                form.reset();
            } else {
                showMessage(data.message || 'Something went wrong');
            }
        } catch (err) {
            showMessage('Server connection error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Send Reset Link';
        }
    };
};
