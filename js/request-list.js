/**
 * 勤怠システム - 申請一覧画面のロジック
 */

// ==========================
// 初期化
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    if (!CONFIG.USE_MOCK && !Auth.isLoggedIn()) {
        Auth.redirectToLogin();
        return;
    }

    loadUserInfo();
    setDefaultFilter();
    loadRequestList();
});

// ==========================
// ユーザー情報表示
// ==========================
function loadUserInfo() {
    const user = Auth.getUser();
    if (user) {
        const nameEl = document.getElementById('headerUserName');
        if (nameEl) nameEl.textContent = user.name;
    }
}

// ==========================
// フィルタ初期値
// ==========================
function setDefaultFilter() {
    const monthFilter = document.getElementById('requestMonthFilter');
    if (monthFilter) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        monthFilter.value = `${y}-${m}`;
    }
}

// ==========================
// 申請一覧データ読み込み
// ==========================
function loadRequestList() {
    if (CONFIG.USE_MOCK) {
        const typeFilter = document.getElementById('requestTypeFilter');
        const filterValue = typeFilter ? typeFilter.value : '';
        let data = getMockRequestList();
        if (filterValue) {
            data = data.filter(r => r.type === filterValue);
        }
        renderRequestTable(data);
    } else {
        Api.get('/request/list').then(data => {
            if (data) {
                renderRequestTable(data);
            }
        }).catch(err => {
            console.error('申請一覧取得エラー:', err);
            showToast('データの取得に失敗しました', 'error');
        });
    }
}

// ==========================
// モック申請データ
// ==========================
function getMockRequestList() {
    return [
        {
            clockGroup: 'さぬきの森ﾃﾞｲ',
            requestDate: '2025/06/12',
            targetDate: '2025/06/02',
            type: '打刻修正申請',
            startTime: '7:30:00',
            endTime: '12:30:00',
            reason: '',
            approvalFlag: '承認済み',
            approver: 'test太郎',
            approvalDate: '2025/06/12'
        },
        {
            clockGroup: 'さぬきの森医務',
            requestDate: '2025/06/12',
            targetDate: '2025/06/03',
            type: '打刻修正申請',
            startTime: '7:30:00',
            endTime: '13:30:00',
            reason: '',
            approvalFlag: '承認済み',
            approver: 'test太郎',
            approvalDate: '2025/06/12'
        },
        {
            clockGroup: '',
            requestDate: '2025/06/12',
            targetDate: '2025/06/03',
            type: '残業申請',
            startTime: '12:30:00',
            endTime: '13:30:00',
            reason: '忙しかったため',
            approvalFlag: '承認済み',
            approver: '藤岡 一慶',
            approvalDate: '2025/07/07'
        },
        {
            clockGroup: '',
            requestDate: '2025/06/27',
            targetDate: '2025/05/10',
            type: '休日出勤申請',
            startTime: '10:00',
            endTime: '13:00',
            reason: '',
            approvalFlag: '承認済み',
            approver: '松本 森',
            approvalDate: '2025/06/27'
        },
        {
            clockGroup: '',
            requestDate: '2026/01/26',
            targetDate: '2026/01/26',
            type: '残業申請',
            startTime: '12:00:00',
            endTime: '13:00:00',
            reason: 'い',
            approvalFlag: '承認済み',
            approver: 'test太郎',
            approvalDate: '2026/01/26'
        },
        {
            clockGroup: '',
            requestDate: '2026/01/26',
            targetDate: '2025/12/16',
            type: '打刻修正申請',
            startTime: '0:00:00',
            endTime: '12:32:00',
            reason: '',
            approvalFlag: '',
            approver: '',
            approvalDate: ''
        },
        {
            clockGroup: '',
            requestDate: '2026/01/27',
            targetDate: '2026/01/27',
            type: '残業申請',
            startTime: '0:00:00',
            endTime: '0:00:00',
            reason: '',
            approvalFlag: '',
            approver: '',
            approvalDate: ''
        }
    ];
}

// ==========================
// テーブル描画
// ==========================
function renderRequestTable(records) {
    const tbody = document.getElementById('requestBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (records.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="10" style="text-align: center; padding: 20px; color: #888;">申請データがありません</td>';
        tbody.appendChild(tr);
        return;
    }

    records.forEach(record => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${record.clockGroup || ''}</td>
      <td>${record.requestDate || ''}</td>
      <td>${record.targetDate || ''}</td>
      <td>${record.type || ''}</td>
      <td>${record.startTime || ''}</td>
      <td>${record.endTime || ''}</td>
      <td>${record.reason || ''}</td>
      <td>${record.approvalFlag || ''}</td>
      <td>${record.approver || ''}</td>
      <td>${record.approvalDate || ''}</td>
    `;
        tbody.appendChild(tr);
    });
}

// ==========================
// ナビゲーション
// ==========================
function goToAdmin() {
    window.location.href = 'admin.html';
}
