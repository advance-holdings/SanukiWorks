/**
 * 勤怠システム - 勤怠一覧画面のロジック
 */

// ==========================
// 初期化
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    // ログインチェック
    if (!CONFIG.USE_MOCK && !Auth.isLoggedIn()) {
        Auth.redirectToLogin();
        return;
    }

    loadUserInfo();
    setDefaultMonth();
    loadMonthData();
});

// ==========================
// ユーザー情報表示
// ==========================
function loadUserInfo() {
    const user = Auth.getUser();
    if (user) {
        const nameEl = document.getElementById('headerUserName');
        const empNoEl = document.getElementById('employeeNumber');
        if (nameEl) nameEl.textContent = user.name;
        if (empNoEl) empNoEl.textContent = user.id || user.employeeId;
    }
}

// ==========================
// デフォルト月をセット
// ==========================
function setDefaultMonth() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        monthSelector.value = `${y}-${m}`;
    }
}

// ==========================
// 月次データ読み込み
// ==========================
function loadMonthData() {
    const monthSelector = document.getElementById('monthSelector');
    if (!monthSelector) return;

    const [year, month] = monthSelector.value.split('-').map(Number);
    const user = Auth.getUser();
    
    if (!user) {
        showToast('ユーザー情報が見つかりません', 'error');
        return;
    }

    const employeeId = user.id || user.employeeId;

    Api.get(`/attendance/monthly/${employeeId}/${year}/${month}`).then(data => {
        if (data) {
            renderAttendanceTable(data.records);
            renderSummary(data.summary);
        }
    }).catch(err => {
        console.error('月次データ取得エラー:', err);
        showToast('実データの取得に失敗しました', 'error');
    });
}

// ==========================
// テーブル描画
// ==========================
function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendanceBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    records.forEach((record, index) => {
        const tr = document.createElement('tr');

        // 曜日による色分け
        let dateClass = '';
        if (record.dayOfWeek === 0) dateClass = 'sunday';    // 日曜
        if (record.dayOfWeek === 6) dateClass = 'saturday';   // 土曜

        tr.innerHTML = `
      <td class="${dateClass}">${record.date}</td>
      <td>${record.schedule || '～'}</td>
      <td>${record.task || ''}</td>
      <td class="${dateClass}">${record.holiday || ''}</td>
      <td>${record.clockGroup || ''}</td>
      <td>${record.workHours || ''}</td>
      <td>${record.overtimeHours || ''}</td>
      <td>${record.dailyOriginalHours || ''}</td>
      <td>${record.comment || ''}</td>
      <td>
        <button class="btn btn-edit" onclick="openEditModal(${index})">編集</button>
      </td>
    `;

        tbody.appendChild(tr);
    });

    // データをグローバルに保持（編集用）
    window._attendanceRecords = records;
}

// ==========================
// 集計表示
// ==========================
function renderSummary(summary) {
    // 勤務日数
    setTextContent('sumWorkDays', summary.workDays);
    setTextContent('sumAbsentDays', summary.absentDays);
    setTextContent('sumLateDays', summary.lateDays);
    setTextContent('sumHolidayWorkDays', summary.holidayWorkDays);
    setTextContent('sumAbsentDays2', summary.absentDays);
    setTextContent('sumPaidLeaveDays', summary.paidLeaveDays);
    setTextContent('sumHolidays', summary.holidays);
    setTextContent('sumSpecialLeaveDays', summary.specialLeaveDays);

    // 勤務時間
    setTextContent('sumWorkHours', summary.workHours);
    setTextContent('sumActualHours', summary.actualHours);
    setTextContent('sumOvertimeHours', summary.overtimeHours);
    setTextContent('sumApprovedOvertime', summary.approvedOvertime);
    setTextContent('sumNightHours', summary.nightHours);
    setTextContent('sumWeeklyOvertime', summary.weeklyOvertime);
    setTextContent('sumHolidayWorkHours', summary.holidayWorkHours);
}

function setTextContent(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '';
}

// ==========================
// 編集モーダル
// ==========================
let editingIndex = -1;

function openEditModal(index) {
    const records = window._attendanceRecords;
    if (!records || !records[index]) return;

    editingIndex = index;
    const record = records[index];

    document.getElementById('editDate').value = record.date;
    document.getElementById('editClockIn').value = '';
    document.getElementById('editClockOut').value = '';
    document.getElementById('editTask').value = record.task || '';
    document.getElementById('editComment').value = record.comment || '';

    document.getElementById('modalEdit').classList.add('active');
}

function closeEditModal() {
    document.getElementById('modalEdit').classList.remove('active');
    editingIndex = -1;
}

function saveEdit() {
    if (editingIndex < 0) return;

    const clockIn = document.getElementById('editClockIn').value;
    const clockOut = document.getElementById('editClockOut').value;
    const task = document.getElementById('editTask').value;
    const comment = document.getElementById('editComment').value;

    if (CONFIG.USE_MOCK) {
        // モックの場合はローカルでデータ更新
        if (window._attendanceRecords && window._attendanceRecords[editingIndex]) {
            window._attendanceRecords[editingIndex].task = task;
            window._attendanceRecords[editingIndex].comment = comment;
            renderAttendanceTable(window._attendanceRecords);
        }
        showToast('勤怠データを更新しました', 'success');
        closeEditModal();
    } else {
        Api.put(`/attendance/${editingIndex}`, {
            clockIn, clockOut, task, comment
        }).then(result => {
            showToast('勤怠データを更新しました', 'success');
            closeEditModal();
            loadMonthData(); // 再読み込み
        }).catch(err => {
            showToast('更新に失敗しました', 'error');
        });
    }
}

// モーダル背景クリックで閉じる
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        editingIndex = -1;
    }
});
