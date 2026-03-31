import { loginPage } from './pages/login.js';
import { dashboardPage } from './pages/dashboard.js';
import { profilePage } from './pages/profile.js';

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
            userInfo = document.createElement('span');
            userInfo.id = 'user-info';
            userInfo.style.fontSize = "0.875rem";
            userInfo.style.color = "#64748b";
            userInfo.style.marginRight = "1rem";
            userInfo.style.cursor = "pointer";
            userInfo.title = "View Profile";
            userInfo.onclick = () => navigate('profile');
            const container = navbar.querySelector('.container');
            container.insertBefore(userInfo, logoutBtn);
        }
        userInfo.innerText = `${userSnapshot.email} (${userSnapshot.role})`;
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
