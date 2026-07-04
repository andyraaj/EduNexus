const API_URL = '/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// Login Handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        // Get role from hidden input or selected card
        const roleInput = document.getElementById('role') || document.getElementById('selectedRole');
        const selectedCard = document.querySelector('.role-card.selected');
        const role = roleInput ? roleInput.value : (selectedCard ? selectedCard.dataset.role : '');

        if (!role) {
            showError('Please select a role before logging in.');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.textContent = 'Signing in...'; submitBtn.disabled = true; }

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));

                if (data.role === 'student') {
                    window.location.href = 'student-dashboard.html';
                } else if (data.role === 'faculty') {
                    window.location.href = 'faculty-dashboard.html';
                } else if (data.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                }
            } else {
                showError(data.message || 'Login failed. Please check your credentials.');
                if (submitBtn) { submitBtn.textContent = 'Sign In'; submitBtn.disabled = false; }
            }
        } catch (err) {
            console.error(err);
            showError('Server error. Please try again later.');
            if (submitBtn) { submitBtn.textContent = 'Sign In'; submitBtn.disabled = false; }
        }
    });
}

function showError(msg) {
    if (errorMessage) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        errorMessage.style.display = 'block';
    }
}

// Auth Guard for internal pages
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user) {
        window.location.href = '/index.html';
        return null;
    }
    return user;
}

// Logout Utility
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

window.logout = logout;
window.checkAuth = checkAuth;
