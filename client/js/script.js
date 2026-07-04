/**
 * EduNexus ERP – Main Script
 * Handles Global UI, Sidebar, Tabs, Auth, and All API Calls
 */

const API_URL = '/api';

// ============================================================
// SESSION HELPERS (unified key: token + user in localStorage)
// ============================================================
function getSession() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user) return null;
    return { token, ...user };
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ============================================================
// AUTH GUARD & PROFILE
// ============================================================
function checkAuth() {
    const session = getSession();
    if (!session || !session.token) {
        window.location.href = '/index.html';
        return null;
    }
    return session;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}
window.logout = logout;

function updateUserProfile() {
    const session = getSession();
    if (!session) return;
    document.querySelectorAll('.user-name-display').forEach(el => el.textContent = session.name || 'User');
    document.querySelectorAll('.user-role-display').forEach(el => el.textContent = session.role ? session.role.charAt(0).toUpperCase() + session.role.slice(1) : '');
    document.querySelectorAll('.user-avatar-display').forEach(el => el.textContent = session.name ? session.name[0].toUpperCase() : 'U');
}

// ============================================================
// SIDEBAR & TABS
// ============================================================
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.tab-container');
            if (!container) return;
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = container.querySelector(`#${btn.dataset.tab}`);
            if (target) target.classList.add('active');
        });
    });
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================
async function loadDashboardStats() {
    const session = getSession();
    if (!session) return;
    const headers = { 'Authorization': `Bearer ${session.token}` };

    try {
        const [attRes, billRes, quizRes, marksRes] = await Promise.all([
            fetch(`${API_URL}/attendance/my`, { headers }),
            fetch(`${API_URL}/billing/my`, { headers }),
            fetch(`${API_URL}/quizzes/active`, { headers }),
            fetch(`${API_URL}/marks/my`, { headers })
        ]);

        if (attRes.ok) {
            const attData = await attRes.json();
            const total = attData.length;
            const present = attData.filter(a => a.status === 'Present').length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
            const el = document.getElementById('dashboard-attendance');
            if (el) el.textContent = `${pct}%`;
        }

        if (billRes.ok) {
            const billData = await billRes.json();
            const pending = billData.filter(i => i.status !== 'Paid').length;
            const el = document.getElementById('dashboard-invoices');
            if (el) el.textContent = pending;
        }

        if (quizRes.ok) {
            const quizData = await quizRes.json();
            const el = document.getElementById('dashboard-quiz');
            if (el) el.textContent = quizData.length > 0 ? quizData[0].title : 'None';
        }

        if (marksRes.ok) {
            const marksData = await marksRes.json();
            if (marksData.length > 0) {
                let totalPoints = 0, totalCredits = 0;
                marksData.forEach(m => {
                    const credits = m.subject.credits || 4;
                    const pct = (m.score / m.maxScore) * 100;
                    let gp = 0;
                    if (pct >= 90) gp = 10; else if (pct >= 80) gp = 9;
                    else if (pct >= 70) gp = 8; else if (pct >= 60) gp = 7;
                    else if (pct >= 50) gp = 6; else if (pct >= 40) gp = 5;
                    totalPoints += gp * credits;
                    totalCredits += credits;
                });
                const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '--';
                const el = document.getElementById('dashboard-cgpa');
                if (el) el.textContent = sgpa;
            }
        }
    } catch (err) {
        console.error('Dashboard stats error:', err);
    }
}

// ============================================================
// ATTENDANCE (STUDENT)
// ============================================================
async function loadAttendance() {
    const session = getSession();
    if (!session) return;

    const monthEl = document.getElementById('att-month');
    const yearEl = document.getElementById('att-year');
    const tbody = document.getElementById('attendance-body');
    if (!monthEl || !yearEl || !tbody) return;

    const month = monthEl.value;
    const year = yearEl.value;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/attendance/my?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        const data = await res.json();
        if (res.ok) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No records found for this period.</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            data.forEach(record => {
                const date = new Date(record.date).toLocaleDateString('en-GB');
                const badge = record.status === 'Present'
                    ? '<span class="badge badge-success">Present</span>'
                    : '<span class="badge badge-danger">Absent</span>';
                tbody.innerHTML += `<tr><td>${date}</td><td>${record.subject ? record.subject.name : '-'}</td><td>${badge}</td><td>${record.markedBy ? 'Faculty' : '-'}</td></tr>`;
            });
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red">Error loading data</td></tr>';
    }
}

async function loadAttendanceSummary() {
    const session = getSession();
    if (!session) return;

    try {
        // Load overall stats
        const res = await fetch(`${API_URL}/attendance/my`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (res.ok) {
            const data = await res.json();
            const total = data.length;
            const present = data.filter(a => a.status === 'Present').length;
            const absent = total - present;
            const pct = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setEl('stat-total-days', total);
            setEl('stat-present', present);
            setEl('stat-absent', absent);
            setEl('stat-percentage', `${pct}%`);
        }

        // Load subject-wise summary
        const sumRes = await fetch(`${API_URL}/attendance/subject-summary`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (sumRes.ok) {
            const summary = await sumRes.json();
            const tbody = document.getElementById('subject-att-body');
            if (tbody) {
                tbody.innerHTML = '';
                summary.forEach(s => {
                    const statusBadge = s.percentage >= 75
                        ? '<span class="badge badge-success">Good</span>'
                        : s.percentage >= 60
                            ? '<span class="badge badge-warning">Low</span>'
                            : '<span class="badge badge-danger">Critical</span>';
                    tbody.innerHTML += `<tr>
                        <td>${s.subject.code || '-'}</td>
                        <td>${s.subject.name}</td>
                        <td>${s.total}</td>
                        <td>${s.present}</td>
                        <td>${s.percentage}%</td>
                        <td>${statusBadge}</td>
                    </tr>`;
                });
            }
        }
    } catch (err) {
        console.error('Attendance summary error:', err);
    }
}

// ============================================================
// RESULTS (STUDENT)
// ============================================================
async function loadResults() {
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/marks/my`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const data = await res.json();
        const tbody = document.getElementById('results-body');
        if (!tbody) return;

        if (res.ok) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No results found.</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            let totalCredits = 0, totalPoints = 0;

            data.forEach(mark => {
                const credits = mark.subject.credits || 4;
                const pct = (mark.score / mark.maxScore) * 100;
                let grade = 'F', gradePoint = 0;
                if (pct >= 90) { grade = 'O'; gradePoint = 10; }
                else if (pct >= 80) { grade = 'A+'; gradePoint = 9; }
                else if (pct >= 70) { grade = 'A'; gradePoint = 8; }
                else if (pct >= 60) { grade = 'B+'; gradePoint = 7; }
                else if (pct >= 50) { grade = 'B'; gradePoint = 6; }
                else if (pct >= 40) { grade = 'P'; gradePoint = 5; }
                totalCredits += credits;
                totalPoints += gradePoint * credits;
                const statusBadge = grade === 'F'
                    ? '<span class="badge badge-danger">FAIL</span>'
                    : '<span class="badge badge-success">PASS</span>';
                tbody.innerHTML += `<tr>
                    <td>${mark.subject.code || 'N/A'}</td>
                    <td>${mark.subject.name}</td>
                    <td>${credits}</td>
                    <td><strong>${grade}</strong></td>
                    <td>${statusBadge}</td>
                </tr>`;
            });

            const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
            const sgpaEl = document.getElementById('sgpa-value');
            if (sgpaEl) sgpaEl.textContent = sgpa;
        }
    } catch (err) {
        console.error('Results error:', err);
    }
}

async function downloadMarksheet(sem) {
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/marks/download/${sem}`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `EduNexus_Marksheet_Sem${sem}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            alert('Error downloading marksheet. Please ensure marks are available.');
        }
    } catch (err) {
        console.error(err);
        alert('Server Error');
    }
}
window.downloadMarksheet = downloadMarksheet;

// ============================================================
// BILLING (STUDENT)
// ============================================================
async function loadBilling() {
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/billing/my`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const data = await res.json();
        const tbody = document.getElementById('billing-body');
        if (!tbody) return;

        if (res.ok) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No invoices found.</td></tr>';
                return;
            }

            let totalBilled = 0, totalPending = 0;
            tbody.innerHTML = '';
            data.forEach(invoice => {
                const date = new Date(invoice.createdAt).toLocaleDateString('en-GB');
                const amount = `₹${invoice.amount.toLocaleString('en-IN')}`;
                totalBilled += invoice.amount;
                if (invoice.status !== 'Paid') totalPending += invoice.amount;

                let statusBadge;
                if (invoice.status === 'Paid') statusBadge = '<span class="badge badge-success">Paid</span>';
                else if (invoice.status === 'Overdue') statusBadge = '<span class="badge badge-danger">Overdue</span>';
                else statusBadge = '<span class="badge badge-warning">Pending</span>';

                const actionBtn = invoice.status === 'Paid'
                    ? `<button class="btn-primary" style="padding:0.25rem 0.5rem;font-size:0.8rem;opacity:0.5" disabled>Paid</button>`
                    : `<button class="btn-primary" style="padding:0.25rem 0.5rem;font-size:0.8rem" onclick="payInvoice('${invoice._id}')">Pay Now</button>`;

                tbody.innerHTML += `<tr>
                    <td>#${invoice._id.slice(-6).toUpperCase()}</td>
                    <td>${invoice.title}</td>
                    <td>${date}</td>
                    <td>${amount}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>`;
            });

            const totalBilledEl = document.getElementById('total-billed');
            const totalPendingEl = document.getElementById('total-pending');
            if (totalBilledEl) totalBilledEl.textContent = `₹${totalBilled.toLocaleString('en-IN')}`;
            if (totalPendingEl) totalPendingEl.textContent = `₹${totalPending.toLocaleString('en-IN')}`;
        }
    } catch (err) {
        console.error('Billing error:', err);
    }
}

async function payInvoice(id) {
    if (!confirm('Proceed to pay this invoice?')) return;
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/billing/pay/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ Payment Successful!');
            loadBilling();
        } else {
            alert(data.message || 'Payment failed');
        }
    } catch (err) {
        alert('Server Error');
    }
}
window.payInvoice = payInvoice;

// ============================================================
// QUIZ (STUDENT)
// ============================================================
let currentQuizData = null;
let currentTimerInterval = null;
let currentAnswers = {};

async function loadQuizzes() {
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/quizzes/active`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const data = await res.json();
        const listContainer = document.getElementById('available-quizzes-list');
        const countEl = document.getElementById('active-quiz-count');

        if (!listContainer) return;
        if (countEl) countEl.textContent = data.length;

        if (!res.ok || data.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-muted)">No active quizzes available at the moment.</p>';
            return;
        }

        listContainer.innerHTML = '';
        data.forEach(quiz => {
            listContainer.innerHTML += `
                <div class="card" style="margin:0; border-top:4px solid var(--primary)">
                    <div style="display:flex;justify-content:space-between;margin-bottom:1rem">
                        <span class="badge badge-success">Active</span>
                        <span style="color:var(--text-muted);font-size:0.9rem">⏱ ${quiz.timeLimitMinutes} Mins</span>
                    </div>
                    <h4>${quiz.title}</h4>
                    <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1.5rem">${quiz.description || 'No description'}</p>
                    <button class="btn-primary" style="width:100%" onclick="startQuiz('${quiz._id}')">Start Quiz →</button>
                </div>`;
        });
    } catch (err) {
        console.error('Load quizzes error:', err);
    }
}

async function startQuiz(quizId) {
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const quiz = await res.json();
        if (!res.ok) { alert(quiz.message || 'Failed to load quiz'); return; }

        currentQuizData = quiz;
        currentAnswers = {};

        // Show player, hide list and tabs
        const listContainer = document.getElementById('quiz-list-container');
        const tabContainer = document.querySelector('.tab-container');
        if (listContainer) listContainer.style.display = 'none';
        if (tabContainer) tabContainer.style.display = 'none';

        const player = document.getElementById('quiz-player-container');
        if (player) player.style.display = 'block';

        document.getElementById('quiz-title').textContent = quiz.title;
        const qContainer = document.getElementById('quiz-questions');
        qContainer.innerHTML = '';

        quiz.questions.forEach((q, i) => {
            let optsHtml = q.options.map((opt, oi) => `
                <div style="margin-bottom:0.5rem">
                    <input type="radio" name="q${i}" id="q${i}_opt${oi}" value="${oi}" onchange="recordAnswer(${i},${oi})">
                    <label for="q${i}_opt${oi}" style="cursor:pointer;margin-left:0.5rem">${opt}</label>
                </div>`).join('');
            qContainer.innerHTML += `
                <div class="question-block" style="margin-bottom:2rem;padding:1rem;background:#f8fafc;border-radius:8px">
                    <p style="font-weight:600;margin-bottom:1rem">${i + 1}. ${q.questionText}</p>
                    ${optsHtml}
                </div>`;
        });

        startTimer(quiz.timeLimitMinutes * 60);
    } catch (err) {
        console.error('Start quiz error:', err);
        alert('Failed to start quiz');
    }
}
window.startQuiz = startQuiz;

function recordAnswer(qIndex, optIndex) { currentAnswers[qIndex] = optIndex; }
window.recordAnswer = recordAnswer;

function startTimer(durationSeconds) {
    let timer = durationSeconds;
    const display = document.getElementById('timer');
    clearInterval(currentTimerInterval);
    currentTimerInterval = setInterval(() => {
        const m = Math.floor(timer / 60);
        const s = timer % 60;
        if (display) display.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        if (--timer < 0) { clearInterval(currentTimerInterval); submitQuiz(true); }
    }, 1000);
}

async function submitQuiz(auto = false) {
    if (!auto && !confirm('Submit quiz now?')) return;
    clearInterval(currentTimerInterval);

    const answersArray = [];
    if (currentQuizData && currentQuizData.questions) {
        for (let i = 0; i < currentQuizData.questions.length; i++) {
            answersArray.push(currentAnswers[i] !== undefined ? currentAnswers[i] : -1);
        }
    }

    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/quizzes/${currentQuizData._id}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ answers: answersArray })
        });
        const result = await res.json();
        if (res.ok) {
            alert(`🎉 Quiz Submitted!\nScore: ${result.score} / ${result.totalQuestions}\nPercentage: ${result.percentage}%`);
            cancelQuiz();
        } else {
            alert(result.message || 'Submission failed');
            cancelQuiz();
        }
    } catch (err) {
        console.error('Submit quiz error:', err);
    }
}
window.submitQuiz = submitQuiz;

function cancelQuiz() {
    clearInterval(currentTimerInterval);
    currentQuizData = null;
    currentAnswers = {};
    const player = document.getElementById('quiz-player-container');
    if (player) player.style.display = 'none';
    const listContainer = document.getElementById('quiz-list-container');
    if (listContainer) listContainer.style.display = 'block';
    const tabContainer = document.querySelector('.tab-container');
    if (tabContainer) tabContainer.style.display = 'block';
    loadQuizzes();
}
window.cancelQuiz = cancelQuiz;

async function loadQuizAttempts() {
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/quizzes/attempts/my`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (!res.ok) return;
        const attempts = await res.json();
        const tbody = document.getElementById('quiz-attempts-body');
        if (!tbody) return;
        if (attempts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No quiz attempts yet.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        attempts.forEach(a => {
            const total = a.quiz.questions ? a.quiz.questions.length : '-';
            const date = new Date(a.submittedAt).toLocaleDateString('en-GB');
            const pct = total !== '-' ? Math.round((a.score / total) * 100) : 0;
            const badge = pct >= 60 ? '<span class="badge badge-success">Passed</span>' : '<span class="badge badge-danger">Failed</span>';
            tbody.innerHTML += `<tr>
                <td>${a.quiz.title}</td>
                <td>${date}</td>
                <td>${a.score}</td>
                <td>${total}</td>
                <td>${badge}</td>
            </tr>`;
        });
    } catch (err) {
        console.error('Quiz attempts error:', err);
    }
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements(category = 'all') {
    const session = getSession();
    if (!session) return;

    const container = document.getElementById('notices-list');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-muted)">Loading announcements...</p>';

    try {
        const url = category === 'all' ? `${API_URL}/announcements` : `${API_URL}/announcements?category=${category}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const notices = await res.json();

        if (!res.ok || notices.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted)">No announcements found.</p>';
            return;
        }

        const categoryColors = { Urgent: 'var(--danger)', Academic: 'var(--primary)', Event: 'var(--info)', General: 'var(--warning)' };
        const categoryBadgeClass = { Urgent: 'badge-danger', Academic: 'badge-info', Event: 'badge-success', General: 'badge-warning' };

        container.innerHTML = '';
        notices.forEach(notice => {
            const borderColor = categoryColors[notice.category] || 'var(--primary)';
            const postedBy = notice.postedBy ? notice.postedBy.name : 'Admin';
            const date = new Date(notice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeAgo = getTimeAgo(notice.createdAt);
            container.innerHTML += `
                <div class="card" style="border-left:5px solid ${borderColor};margin-bottom:1rem">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;align-items:flex-start">
                        <h4 style="color:${borderColor};margin:0">${notice.title}</h4>
                        <span style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;margin-left:1rem">${timeAgo}</span>
                    </div>
                    <p style="font-size:0.95rem;line-height:1.6;color:var(--text-dark)">${notice.content}</p>
                    <div style="margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center">
                        <span class="badge ${categoryBadgeClass[notice.category] || 'badge-info'}">${notice.category}</span>
                        <span style="font-size:0.8rem;color:var(--text-muted)">Posted by ${postedBy} • ${date}</span>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error('Announcements error:', err);
        container.innerHTML = '<p style="color:red">Error loading announcements.</p>';
    }
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hrs > 0) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// ============================================================
// ADMIN
// ============================================================
async function loadAdminDashboardStats() {
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (!res.ok) return;
        const stats = await res.json();

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('admin-stat-students', stats.totalStudents);
        setEl('admin-stat-faculty', stats.totalFaculty);
        setEl('admin-stat-revenue', `₹${(stats.totalRevenue / 1000).toFixed(1)}K`);
        setEl('admin-stat-health', '99.9%');
    } catch (err) {
        console.error('Admin stats error:', err);
    }
}

async function loadAllUsers() {
    const session = getSession();
    if (!session) return;

    const roleFilter = document.getElementById('role-filter');
    const role = roleFilter ? roleFilter.value : '';
    let url = `${API_URL}/users`;
    if (role) url += `?role=${role}`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const users = await res.json();
        const tbody = document.getElementById('users-list-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        users.forEach(user => {
            const date = new Date(user.createdAt).toLocaleDateString('en-GB');
            const roleColor = { student: 'badge-info', faculty: 'badge-success', admin: 'badge-danger' };
            tbody.innerHTML += `<tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge ${roleColor[user.role] || 'badge-info'}">${user.role}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-primary" style="padding:0.25rem 0.75rem;font-size:0.8rem;background-color:var(--danger)" onclick="deleteUser('${user._id}')">Remove</button>
                </td>
            </tr>`;
        });
    } catch (err) {
        console.error('Load users error:', err);
    }
}
window.loadAllUsers = loadAllUsers;

async function deleteUser(id) {
    if (!confirm('Are you sure you want to remove this user? This cannot be undone.')) return;
    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        const data = await res.json();
        if (res.ok) {
            alert('User removed successfully.');
            loadAllUsers();
        } else {
            alert(data.message || 'Error removing user');
        }
    } catch (err) {
        alert('Server Error');
    }
}
window.deleteUser = deleteUser;

async function addUser(e) {
    e.preventDefault();
    const session = getSession();
    if (!session) return;

    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;

    try {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ User "${data.name}" created successfully!`);
            document.getElementById('add-user-modal').style.display = 'none';
            document.getElementById('add-user-form').reset();
            loadAllUsers();
        } else {
            alert(data.message || 'Error creating user');
        }
    } catch (err) {
        alert('Server Error');
    }
}
window.addUser = addUser;

// ============================================================
// FACULTY LOGIC
// ============================================================
async function loadFacultySubjects(elementId) {
    const session = getSession();
    if (!session) return;
    const select = document.getElementById(elementId);
    if (!select) return;

    try {
        const res = await fetch(`${API_URL}/faculty/subjects`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (!res.ok) return;
        const subjects = await res.json();
        select.innerHTML = '<option value="">-- Select Subject --</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub._id;
            opt.textContent = `${sub.name} (${sub.code})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Faculty subjects error:', err);
    }
}

async function loadStudentListForAttendance() {
    const subject = document.getElementById('att-subject').value;
    const date = document.getElementById('att-date').value;

    if (!subject || !date) { alert('Please select Subject and Date'); return; }

    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/faculty/students`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const students = await res.json();
        const tbody = document.getElementById('attendance-list-body');
        tbody.innerHTML = '';
        students.forEach(student => {
            tbody.innerHTML += `<tr>
                <td>${student.rollNumber || 'N/A'}</td>
                <td>${student.user ? student.user.name : '-'}</td>
                <td>
                    <select class="form-control att-status" data-student-id="${student.user ? student.user._id : ''}">
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                    </select>
                </td>
            </tr>`;
        });
        const container = document.getElementById('student-list-container');
        if (container) container.style.display = 'block';
    } catch (err) {
        console.error(err);
        alert('Error loading students');
    }
}
window.loadStudentListForAttendance = loadStudentListForAttendance;

async function submitBulkAttendance() {
    const subjectId = document.getElementById('att-subject').value;
    const date = document.getElementById('att-date').value;
    const rows = document.querySelectorAll('.att-status');
    const session = getSession();
    if (!session || !subjectId || !date) { alert('Please fill all fields'); return; }

    let success = 0;
    for (const select of rows) {
        const studentId = select.getAttribute('data-student-id');
        const status = select.value;
        try {
            const res = await fetch(`${API_URL}/attendance`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ studentId, subjectId, date, status })
            });
            if (res.ok) success++;
        } catch (err) {
            console.error(err);
        }
    }
    alert(`✅ Attendance marked for ${success} student(s).`);
    document.getElementById('student-list-container').style.display = 'none';
}
window.submitBulkAttendance = submitBulkAttendance;

async function loadStudentListForGrading() {
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/faculty/students`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        const students = await res.json();
        const tbody = document.getElementById('grading-list-body');
        tbody.innerHTML = '';
        students.forEach(student => {
            tbody.innerHTML += `<tr>
                <td>${student.rollNumber || 'N/A'}</td>
                <td>${student.user ? student.user.name : '-'}</td>
                <td><input type="number" class="form-control grade-score" placeholder="Score" min="0"></td>
                <td><input type="number" class="form-control grade-max" value="100" min="1"></td>
                <td><button class="btn-primary" onclick="submitMarks('${student.user ? student.user._id : ''}', this)" style="padding:0.25rem 0.75rem;font-size:0.85rem">Save</button></td>
            </tr>`;
        });
        const container = document.getElementById('grading-list-container');
        if (container) container.style.display = 'block';
    } catch (err) {
        console.error(err);
        alert('Error loading students');
    }
}
window.loadStudentListForGrading = loadStudentListForGrading;

async function submitMarks(studentId, btn) {
    const row = btn.closest('tr');
    const score = row.querySelector('.grade-score').value;
    const maxScore = row.querySelector('.grade-max').value;
    const subjectId = document.getElementById('grade-subject').value;
    const examType = document.getElementById('grade-exam-type').value;

    if (!score || !subjectId || !examType) { alert('Please fill all fields'); return; }

    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/marks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ studentId, subjectId, examType, score: Number(score), maxScore: Number(maxScore) })
        });
        if (res.ok) {
            btn.textContent = '✅ Saved';
            btn.disabled = true;
        } else {
            const d = await res.json();
            alert(d.message || 'Error saving marks');
        }
    } catch (err) {
        alert('Server Error');
    }
}
window.submitMarks = submitMarks;

function addQuestionField() {
    const container = document.getElementById('questions-container');
    const qNum = document.querySelectorAll('.question-item').length + 1;
    const div = document.createElement('div');
    div.className = 'question-item';
    div.style = 'border:1px solid #ddd;padding:1rem;margin-bottom:1rem;border-radius:8px;background:#f8fafc';
    div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
            <strong>Question ${qNum}</strong>
            <button type="button" onclick="this.closest('.question-item').remove()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.2rem">✕</button>
        </div>
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" class="form-control q-text" placeholder="Enter your question here" required>
        </div>
        <div class="form-group">
            <label>Options (comma-separated, 4 options)</label>
            <input type="text" class="form-control q-options" placeholder="Option A, Option B, Option C, Option D" required>
        </div>
        <div class="form-group">
            <label>Correct Option Index (0=A, 1=B, 2=C, 3=D)</label>
            <input type="number" class="form-control q-correct" min="0" max="3" placeholder="0-3" required>
        </div>`;
    container.appendChild(div);
}
window.addQuestionField = addQuestionField;

async function handleCreateQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('quiz-title-input') ? document.getElementById('quiz-title-input').value : document.getElementById('quiz-title').value;
    const description = document.getElementById('quiz-desc').value;
    const subjectId = document.getElementById('quiz-subject').value;
    const timeLimitMinutes = document.getElementById('quiz-time').value;

    if (!subjectId) { alert('Please select a subject'); return; }

    const qItems = document.querySelectorAll('.question-item');
    if (qItems.length === 0) { alert('Please add at least one question'); return; }

    const questions = Array.from(qItems).map(item => ({
        questionText: item.querySelector('.q-text').value,
        options: item.querySelector('.q-options').value.split(',').map(o => o.trim()),
        correctOptionIndex: parseInt(item.querySelector('.q-correct').value)
    }));

    const session = getSession();
    if (!session) return;

    try {
        const res = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, description, subjectId, timeLimitMinutes, questions })
        });
        if (res.ok) {
            alert('✅ Quiz Created Successfully!');
            window.location.reload();
        } else {
            const d = await res.json();
            alert(d.message || 'Error creating quiz');
        }
    } catch (err) {
        alert('Server Error');
    }
}
window.handleCreateQuiz = handleCreateQuiz;

async function loadFacultyQuizzes() {
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/quizzes`, { headers: { 'Authorization': `Bearer ${session.token}` } });
        if (!res.ok) return;
        const quizzes = await res.json();
        const container = document.getElementById('faculty-quiz-list');
        if (!container) return;
        if (quizzes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted)">No quizzes created yet.</p>';
            return;
        }
        container.innerHTML = '';
        quizzes.forEach(quiz => {
            container.innerHTML += `
                <div class="card" style="margin:0;display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <h4>${quiz.title}</h4>
                        <p style="color:var(--text-muted);font-size:0.9rem">${quiz.questions ? quiz.questions.length : 0} questions • ${quiz.timeLimitMinutes} mins • ${quiz.subject ? quiz.subject.name : '-'}</p>
                    </div>
                    <div style="display:flex;gap:0.5rem;align-items:center">
                        <span class="badge ${quiz.isActive ? 'badge-success' : 'badge-warning'}">${quiz.isActive ? 'Active' : 'Inactive'}</span>
                        <button class="btn-primary" style="padding:0.25rem 0.75rem;font-size:0.85rem;background-color:${quiz.isActive ? 'var(--warning)' : 'var(--success)'}" onclick="toggleQuiz('${quiz._id}', this)">${quiz.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error('Faculty quizzes error:', err);
    }
}

async function toggleQuiz(id, btn) {
    const session = getSession();
    if (!session) return;
    try {
        const res = await fetch(`${API_URL}/quizzes/${id}/toggle`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        if (res.ok) loadFacultyQuizzes();
    } catch (err) {
        console.error(err);
    }
}
window.toggleQuiz = toggleQuiz;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initTabs();
    checkAuth();
    updateUserProfile();

    const path = window.location.pathname;

    if (path.includes('student-dashboard.html')) {
        loadDashboardStats();
    }
    if (path.includes('attendance.html') && !path.includes('faculty')) {
        const now = new Date();
        const monthEl = document.getElementById('att-month');
        const yearEl = document.getElementById('att-year');
        if (monthEl) monthEl.value = now.getMonth() + 1;
        if (yearEl) yearEl.value = now.getFullYear();
        loadAttendanceSummary();
        loadAttendance();
    }
    if (path.includes('results.html')) {
        loadResults();
    }
    if (path.includes('billing.html')) {
        loadBilling();
    }
    if (path.includes('quiz.html') && !path.includes('faculty')) {
        loadQuizzes();
        loadQuizAttempts();
    }
    if (path.includes('announcements.html')) {
        loadAnnouncements();
    }

    // Faculty pages
    if (path.includes('faculty-attendance.html')) {
        loadFacultySubjects('att-subject');
    }
    if (path.includes('faculty-results.html')) {
        loadFacultySubjects('grade-subject');
    }
    if (path.includes('faculty-quizzes.html')) {
        loadFacultySubjects('quiz-subject');
        loadFacultyQuizzes();
    }

    // Admin pages
    if (path.includes('admin-dashboard.html')) {
        loadAdminDashboardStats();
    }
    if (path.includes('admin-users.html')) {
        loadAllUsers();
    }
});
