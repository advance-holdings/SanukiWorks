/**
 * 勤怠システム - ダッシュボード画面のロジック
 */

// ==========================
// 初期化
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    // ログインチェック（モック時はスキップ可能）
    if (!CONFIG.USE_MOCK && !Auth.isLoggedIn()) {
        Auth.redirectToLogin();
        return;
    }

    loadUserInfo();
    loadWorkStatus();
});

// ==========================
// ユーザー情報表示
// ==========================
function loadUserInfo() {
    const user = Auth.getUser();
    if (user) {
        const nameEl = document.getElementById('headerUserName');
        const groupEl = document.getElementById('headerGroupName');
        if (nameEl) nameEl.textContent = user.name;
        if (groupEl) groupEl.textContent = user.group;
    }
}

// ==========================
// 勤務状態の取得・表示
// ==========================
function loadWorkStatus() {
    if (CONFIG.USE_MOCK) {
        const status = MockData.getStatus();
        updateStatusDisplay(status);
    } else {
        Api.get('/attendance/status').then(status => {
            if (status) updateStatusDisplay(status);
        }).catch(err => {
            console.error('勤務状態の取得に失敗:', err);
        });
    }
}

function updateStatusDisplay(status) {
    const statusBar = document.getElementById('statusBar');
    if (!statusBar) return;

    if (status.status === 'working') {
        statusBar.textContent = '勤務中';
        statusBar.className = 'status-bar working';
    } else {
        statusBar.textContent = '勤務外';
        statusBar.className = 'status-bar off';
    }

    // スケジュール
    const scheduleStart = document.getElementById('scheduleStart');
    const scheduleEnd = document.getElementById('scheduleEnd');
    const actualStart = document.getElementById('actualStart');
    const actualEnd = document.getElementById('actualEnd');

    if (scheduleStart && status.schedule) {
        scheduleStart.value = status.schedule.start || '';
    }
    if (scheduleEnd && status.schedule) {
        scheduleEnd.value = status.schedule.end || '';
    }
    if (actualStart) {
        actualStart.value = status.clockInTime ? status.clockInTime.substring(0, 5) : '';
    }
    if (actualEnd) {
        actualEnd.value = status.clockOutTime ? status.clockOutTime.substring(0, 5) : '';
    }
}

// ==========================
// モーダル制御
// ==========================
function openModal(type) {
    let modalId = '';
    switch (type) {
        case 'correction':
            modalId = 'modalCorrection';
            break;
        case 'overtime':
            modalId = 'modalOvertime';
            break;
        case 'holiday':
            modalId = 'modalHoliday';
            break;
    }

    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        // 今日の日付をセット
        const today = new Date().toISOString().split('T')[0];
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) dateInput.value = today;
    }
}

function closeModal(type) {
    let modalId = '';
    switch (type) {
        case 'correction':
            modalId = 'modalCorrection';
            break;
        case 'overtime':
            modalId = 'modalOvertime';
            break;
        case 'holiday':
            modalId = 'modalHoliday';
            break;
    }

    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// モーダル背景クリックで閉じる
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ==========================
// 打刻修正申請
// ==========================
function submitCorrection() {
    const date = document.getElementById('correctionDate').value;
    const clockIn = document.getElementById('correctionClockIn').value;
    const clockOut = document.getElementById('correctionClockOut').value;
    const reason = document.getElementById('correctionReason').value;

    if (!date || !reason) {
        showToast('対象日と理由を入力してください', 'error');
        return;
    }

    if (CONFIG.USE_MOCK) {
        showToast('打刻修正申請を送信しました', 'success');
        closeModal('correction');
    } else {
        Api.post('/request/correction', {
            date, clockIn, clockOut, reason
        }).then(result => {
            showToast('打刻修正申請を送信しました', 'success');
            closeModal('correction');
        }).catch(err => {
            showToast('申請の送信に失敗しました', 'error');
        });
    }
}

// ==========================
// 残業申請
// ==========================
function submitOvertime() {
    const date = document.getElementById('overtimeDate').value;
    const hours = document.getElementById('overtimeHours').value;
    const reason = document.getElementById('overtimeReason').value;

    if (!date || !reason) {
        showToast('対象日と理由を入力してください', 'error');
        return;
    }

    if (CONFIG.USE_MOCK) {
        showToast('残業申請を送信しました', 'success');
        closeModal('overtime');
    } else {
        Api.post('/request/overtime', {
            date, hours, reason
        }).then(result => {
            showToast('残業申請を送信しました', 'success');
            closeModal('overtime');
        }).catch(err => {
            showToast('申請の送信に失敗しました', 'error');
        });
    }
}

// ==========================
// 休日出勤申請
// ==========================
function submitHoliday() {
    const date = document.getElementById('holidayDate').value;
    const start = document.getElementById('holidayStart').value;
    const end = document.getElementById('holidayEnd').value;
    const reason = document.getElementById('holidayReason').value;

    if (!date || !reason) {
        showToast('対象日と理由を入力してください', 'error');
        return;
    }

    if (CONFIG.USE_MOCK) {
        showToast('休日出勤申請を送信しました', 'success');
        closeModal('holiday');
    } else {
        Api.post('/request/holiday-work', {
            date, start, end, reason
        }).then(result => {
            showToast('休日出勤申請を送信しました', 'success');
            closeModal('holiday');
        }).catch(err => {
            showToast('申請の送信に失敗しました', 'error');
        });
    }
}

// ==========================
// ナビゲーション
// ==========================
function goToAdmin() {
    window.location.href = 'admin.html';
}

function goToAttendance() {
    window.location.href = 'attendance.html';
}

function goToRequestList() {
    window.location.href = 'request-list.html';
}
