import { loginPage } from './pages/login.js';
import { dashboardPage } from './pages/dashboard.js';
import { profilePage } from './pages/profile.js';
import { certificatesPage } from './pages/certificates.js';
import { usersPage } from './pages/users.js';

const appRoot = document.getElementById('app-root');
const navbar = document.getElementById('navbar');
const logoutBtn = document.getElementById('logoutBtn');

let userSnapshot = null;

export const navigate = async (page) => {
    const token = localStorage.getItem('accessToken');
    
    if (!token && page !== 'login' && page !== 'register') {
        window.history.pushState({}, '', '/login');
        renderPage('login');
        return;
    }

    if (token && !userSnapshot && page !== 'login' && page !== 'register') {
        await fetchUserSnapshot();
    }

    if (token && (page === 'login' || page === 'register')) {
        window.history.pushState({}, '', '/dashboard');
        renderPage('dashboard');
        return;
    }

    window.history.pushState({}, '', `/${page}`);
    renderPage(page);
};

const fetchUserSnapshot = async () => {
    const token = localStorage.getItem('accessToken');
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            userSnapshot = await res.json();
            localStorage.setItem('userRole', userSnapshot.role);
            updateNavbar();
        } else {
            localStorage.removeItem('accessToken');
            navigate('login');
        }
    } catch (err) {
        console.error('Failed to fetch user snapshot', err);
    }
};

const updateNavbar = () => {
    if (userSnapshot) {
        navbar.classList.remove('hidden');
        let userInfo = document.getElementById('user-info');
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.id = 'user-info';
            userInfo.style.display = 'flex';
            userInfo.style.alignItems = 'center';
            userInfo.style.gap = '1rem';
            userInfo.style.marginRight = '1.5rem';
            
            const userDetails = document.createElement('div');
            userDetails.style.textAlign = 'right';
            userDetails.style.cursor = 'pointer';
            userDetails.onclick = () => navigate('profile');
            
            const navLinks = document.createElement('div');
            navLinks.style.display = 'flex';
            navLinks.style.gap = '1.5rem';
            navLinks.style.marginRight = '2rem';
            navLinks.style.alignItems = 'center';
            
            const dashboardLink = document.createElement('a');
            dashboardLink.innerText = 'Dashboard';
            dashboardLink.style.fontSize = '0.875rem';
            dashboardLink.style.fontWeight = '600';
            dashboardLink.style.color = '#64748b';
            dashboardLink.style.cursor = 'pointer';
            dashboardLink.onclick = () => navigate('dashboard');
            
            const certsLink = document.createElement('a');
            certsLink.innerText = 'My Certificates';
            certsLink.style.fontSize = '0.875rem';
            certsLink.style.fontWeight = '600';
            certsLink.style.color = '#64748b';
            certsLink.style.cursor = 'pointer';
            certsLink.onclick = () => navigate('certificates');
            
            navLinks.appendChild(dashboardLink);
            navLinks.appendChild(certsLink);

            if (userSnapshot.role === 'admin') {
                const usersLink = document.createElement('a');
                usersLink.innerText = 'Manage Users';
                usersLink.style.fontSize = '0.875rem';
                usersLink.style.fontWeight = '600';
                usersLink.style.color = '#6366f1';
                usersLink.style.cursor = 'pointer';
                usersLink.onclick = () => navigate('users');
                navLinks.appendChild(usersLink);
            }
            
            const userEmail = document.createElement('div');
            userEmail.style.fontSize = '0.875rem';
            userEmail.style.fontWeight = '600';
            userEmail.style.color = '#1e293b';
            userEmail.id = 'nav-user-email';
            
            const userRole = document.createElement('div');
            userRole.style.fontSize = '0.75rem';
            userRole.style.color = '#64748b';
            userRole.style.textTransform = 'uppercase';
            userRole.style.letterSpacing = '0.025em';
            userRole.id = 'nav-user-role';
            
            userDetails.appendChild(userEmail);
            userDetails.appendChild(userRole);
            userInfo.appendChild(navLinks);
            userInfo.appendChild(userDetails);
            
            const container = navbar.querySelector('.container');
            container.insertBefore(userInfo, logoutBtn);
        }
        document.getElementById('nav-user-email').innerText = userSnapshot.email;
        document.getElementById('nav-user-role').innerText = userSnapshot.role;
    } else {
        navbar.classList.add('hidden');
    }
};

const renderPage = (page) => {
    appRoot.innerHTML = '';
    
    if (page === 'dashboard') {
        navbar.classList.remove('hidden');
        dashboardPage(appRoot);
    } else if (page === 'profile') {
        navbar.classList.remove('hidden');
        profilePage(appRoot);
    } else if (page === 'certificates') {
        navbar.classList.remove('hidden');
        certificatesPage(appRoot);
    } else if (page === 'users') {
        navbar.classList.remove('hidden');
        usersPage(appRoot);
    } else {
        navbar.classList.add('hidden');
        loginPage(appRoot, page === 'register');
    }
};

// Initial Load
window.addEventListener('popstate', () => {
    const path = window.location.pathname.slice(1) || 'dashboard';
    renderPage(path);
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    navigate('login');
});

const initialPath = window.location.pathname.slice(1) || 'dashboard';
navigate(initialPath);
