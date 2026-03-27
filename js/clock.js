/**
 * 勤怠システム - 打刻・ログイン画面のロジック
 */

// ==========================
// 出勤打刻
// ==========================
function handleClockIn() {
    const employeeId = document.getElementById('employeeId').value;

    if (!employeeId) {
        showToast('アカウントコードを入力してください', 'error');
        return;
    }

    Api.post('/attendance/clockin', {
        employeeId: employeeId,
        comment: "", // 削除済みのため空文字
        clockGroup: "", // 削除済みのため空文字
        timestamp: new Date().toISOString()
    }).then(result => {
        if (result && result.success) {
            showToast(`出勤を記録しました [${result.time}]`, 'success');
            highlightButton('btnClockIn');
        }
    }).catch(err => {
        showToast('打刻に失敗しました', 'error');
    });
}

// ==========================
// 退勤打刻
// ==========================
function handleClockOut() {
    const employeeId = document.getElementById('employeeId').value;

    if (!employeeId) {
        showToast('アカウントコードを入力してください', 'error');
        return;
    }

    Api.post('/attendance/clockout', {
        employeeId: employeeId,
        comment: "",
        clockGroup: "",
        timestamp: new Date().toISOString()
    }).then(result => {
        if (result && result.success) {
            showToast(`退勤を記録しました [${result.time}]`, 'success');
            highlightButton('btnClockOut');
        }
    }).catch(err => {
        showToast('打刻に失敗しました', 'error');
    });
}

// ==========================
// ログイン処理 (調査用デバッグ版)
// ==========================
function handleLogin() {
    const employeeId = document.getElementById('employeeId').value;
    const password = document.getElementById('password').value;

    console.log('--- ログイン処理開始 ---');
    console.log('社員番号:', employeeId);
    console.log('モード:', CONFIG.USE_MOCK ? 'MOCK' : 'API');

    if (!employeeId || !password) {
        alert('IDとパスワードを入力してください');
        return;
    }

    if (CONFIG.USE_MOCK) {
        console.log('モックログイン実行');
        const result = MockData.login(employeeId, password);
        if (result) {
            Auth.setToken(result.token);
            Auth.setUser(result.user);
            showToast('ログインしました', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            alert('ダミーデータに社員番号またはパスワードが見つかりません');
        }
    } else {
        console.log('APIログイン実行 ->', CONFIG.API_BASE_URL + '/auth/login');
        
        Api.post('/auth/login', {
            employeeId: employeeId,
            password: password
        }).then(result => {
            console.log('API結果:', result);
            if (result && result.token) {
                Auth.setToken(result.token);
                Auth.setUser(result.user);
                showToast('ログインしました', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                alert('ログイン失敗: ユーザーIDまたはパスワードが違います');
            }
        }).catch(err => {
            console.error('通信エラー詳細:', err);
            alert('サーバーに接続できませんでした。\n\n確認事項:\n1. Visual Studioでプログラムが実行中か(F5)\n2. 黒い画面(コンソール)が開いているか');
        });
    }
}

// ==========================
// ボタンハイライト
// ==========================
function highlightButton(btnId) {
    // リセット
    document.getElementById('btnClockIn').style.backgroundColor = '';
    document.getElementById('btnClockOut').style.backgroundColor = '#d5d5d5';

    const btn = document.getElementById(btnId);
    if (btnId === 'btnClockIn') {
        btn.style.backgroundColor = '#f0b0c0';
        btn.style.border = '2px solid #d48a9a';
    } else {
        btn.style.backgroundColor = '#f0b0c0';
        btn.style.border = '2px solid #d48a9a';
        document.getElementById('btnClockIn').style.backgroundColor = '#d5d5d5';
    }
}

// ==========================
// Enterキーでログイン
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    const employeeIdEl = document.getElementById('employeeId');
    const displayNameEl = document.getElementById('accountDisplayName');
    const passwordEl = document.getElementById('password');

    if (employeeIdEl) {
        employeeIdEl.addEventListener('input', (e) => {
            const code = e.target.value;
            if (code.length >= 7) { // 適切な長さ or blur時に行う
                Api.get(`/admin/info/${code}`).then(res => {
                    if (res && res.name) {
                        displayNameEl.textContent = `${res.name} さん`;
                    } else {
                        displayNameEl.textContent = '';
                    }
                }).catch(() => {
                    displayNameEl.textContent = '';
                });
            } else {
                displayNameEl.textContent = '';
            }
        });
    }

    if (passwordEl) {
        passwordEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
});
