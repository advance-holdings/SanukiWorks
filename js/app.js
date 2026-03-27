/**
 * 勤怠システム - 共通処理モジュール
 * API通信、認証管理、ユーティリティ関数
 */

// ==========================
// 設定
// ==========================
const CONFIG = {
  // アクセス元のホスト名（localhostやIPアドレス）に合わせてAPIサーバーのURLを設定
  API_BASE_URL: `http://${window.location.hostname}:5163/api`,
  USE_MOCK: false,
};

// ==========================
// 認証管理
// ==========================
const Auth = {
  /**
   * JWTトークンを保存
   */
  setToken(token) {
    sessionStorage.setItem('jwt_token', token);
  },

  /**
   * JWTトークンを取得
   */
  getToken() {
    return sessionStorage.getItem('jwt_token');
  },

  /**
   * ユーザー情報を保存
   */
  setUser(user) {
    sessionStorage.setItem('user_info', JSON.stringify(user));
  },

  /**
   * ユーザー情報を取得
   */
  getUser() {
    const data = sessionStorage.getItem('user_info');
    return data ? JSON.parse(data) : null;
  },

  /**
   * ログイン状態チェック
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * セッションクリア
   */
  clear() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_info');
  },

  /**
   * ログインページへリダイレクト
   */
  redirectToLogin() {
    window.location.href = 'index.html';
  },

  /**
   * ダッシュボードへリダイレクト
   */
  redirectToDashboard() {
    window.location.href = 'dashboard.html';
  }
};

// ==========================
// API通信ヘルパー
// ==========================
const Api = {
  /**
   * GETリクエスト
   */
  async get(endpoint) {
    return this._request('GET', endpoint);
  },

  /**
   * POSTリクエスト
   */
  async post(endpoint, body) {
    return this._request('POST', endpoint, body);
  },

  /**
   * PUTリクエスト
   */
  async put(endpoint, body) {
    return this._request('PUT', endpoint, body);
  },

  /**
   * DELETEリクエスト
   */
  async delete(endpoint, body = null) {
    return this._request('DELETE', endpoint, body);
  },

  /**
   * 内部リクエスト処理
   */
  async _request(method, endpoint, body = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = Auth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);

      if (response.status === 401) {
        Auth.clear();
        Auth.redirectToLogin();
        return null;
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API通信エラー:', error);
      throw error;
    }
  },

  /**
   * 現在のログインユーザー情報を取得
   */
  getCurrentUser() {
    return Auth.getUser();
  }
};

// ==========================
// モックデータ
// ==========================
const MockData = {
  users: [
    {
      id: '1000105',
      employeeId: '1000232',
      name: 'テスト 太郎',
      password: 'kaihatu1',
      group: 'さぬき営繕・医務',
      role: 'user'
    }
  ],

  facilityMembers: {
    'さぬき': [
      { id: '1', name: 'さぬき 太郎', isWorking: false },
      { id: '2', name: '石川 浩次', isWorking: true },
      { id: '3', name: '四宮 健二', isWorking: false },
      { id: '4', name: '田中 元', isWorking: true },
      { id: '5', name: 'ブイティ ファン', isWorking: false },
      { id: '6', name: '広瀬 敬', isWorking: true },
      { id: '7', name: '桑田 整治', isWorking: false },
      { id: '8', name: '宮本 一仁', isWorking: true }
    ],
    '玉藻荘': [
      { id: '101', name: '玉藻 一郎', isWorking: false },
      { id: '102', name: '佐藤 次郎', isWorking: true }
    ],
    'さぬきの森': [
      { id: '201', name: '森山 花子', isWorking: false },
      { id: '202', name: '林 茂', isWorking: true }
    ],
    '新番丁': [
      { id: '301', name: '新田 健太', isWorking: false },
      { id: '302', name: '番場 恵', isWorking: true }
    ]
  },

  /**
   * 施設メンバーを取得
   */
  getFacilityMembers(facilityName) {
    return this.facilityMembers[facilityName] || [];
  },

  /**
   * ログイン認証（モック）
   */
  login(employeeId, password) {
    const user = this.users.find(u => u.employeeId === employeeId && u.password === password);
    if (user) {
      return {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          group: user.group,
          role: user.role
        }
      };
    }
    return null;
  },

  /**
   * 勤務状態取得（モック）
   */
  getStatus() {
    const status = sessionStorage.getItem('work_status') || 'off';
    const clockIn = sessionStorage.getItem('clock_in_time') || '';
    const clockOut = sessionStorage.getItem('clock_out_time') || '';
    let actual = '';
    if (clockIn && clockOut) {
      actual = clockIn.substring(0, 5) + ' ～ ' + clockOut.substring(0, 5);
    } else if (clockIn) {
      actual = clockIn.substring(0, 5) + ' ～';
    }
    return {
      status: status,
      clockInTime: clockIn,
      clockOutTime: clockOut,
      schedule: { start: '', end: '' },
      actual: actual
    };
  },

  /**
   * 打刻処理（モック）
   */
  clockIn(comment) {
    const now = new Date();
    sessionStorage.setItem('work_status', 'working');
    sessionStorage.setItem('clock_in_time', formatTime(now));
    return { success: true, time: formatTime(now), message: '出勤を記録しました' };
  },

  clockOut(comment) {
    const now = new Date();
    sessionStorage.setItem('work_status', 'off');
    sessionStorage.setItem('clock_out_time', formatTime(now));
    return { success: true, time: formatTime(now), message: '退勤を記録しました' };
  },

  /**
   * 月次勤怠データ取得（モック）
   */
  getMonthlyAttendance(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const records = [];
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayYear = now.getFullYear();

    // sessionStorageから今日の打刻情報を取得
    const clockIn = sessionStorage.getItem('clock_in_time') || '';
    const clockOut = sessionStorage.getItem('clock_out_time') || '';

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = `${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;

      let record = {
        date: dateStr,
        dayOfWeek: dayOfWeek,
        schedule: '～',
        task: '',
        holiday: isWeekend ? '～' : '',
        clockGroup: '',
        workHours: '',
        overtimeHours: '',
        dailyOriginalHours: '',
        comment: ''
      };

      if (!isWeekend && day <= 5) {
        record.schedule = '～';
        record.holiday = '～';
      }

      // 今日の日付なら打刻データを反映
      if (year === todayYear && month === todayMonth && day === todayDay) {
        if (clockIn && clockOut) {
          record.workHours = clockIn.substring(0, 5) + ' ～ ' + clockOut.substring(0, 5);
        } else if (clockIn) {
          record.workHours = clockIn.substring(0, 5) + ' ～';
        }
      }

      records.push(record);
    }

    return {
      records: records,
      summary: {
        workDays: 3,
        absentDays: 0,
        lateDays: 0,
        holidayWorkDays: 0,
        paidLeaveDays: 0,
        specialLeaveDays: 0,
        holidays: 0,
        workHours: '00:00',
        actualHours: '00:08',
        overtimeHours: '00:00',
        nightHours: '07:00',
        holidayWorkHours: '0',
        approvedOvertime: '',
        weeklyOvertime: ''
      }
    };
  }
};

// ==========================
// ユーティリティ関数
// ==========================

/**
 * 日付を日本語フォーマットに変換
 */
function formatDateJP(date) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

/**
 * 時刻を HH:MM:SS フォーマットに変換
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${min}:${s}`;
}

/**
 * リアルタイム時計を更新
 */
function startClock() {
  function update() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) dateEl.textContent = formatDateJP(now);
    if (timeEl) timeEl.textContent = formatTime(now);
  }
  update();
  setInterval(update, 1000);
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * ログアウト処理
 */
function handleLogout() {
  Auth.clear();
  showToast('ログアウトしました', 'info');
  setTimeout(() => {
    Auth.redirectToLogin();
  }, 500);
}

// ==========================
// ナビメニュー（グリッドアイコン）
// ==========================

/**
 * ナビメニューの表示/非表示を切り替え
 */
function toggleNavMenu() {
  const popover = document.getElementById('navPopover');
  if (popover) {
    popover.classList.toggle('active');
  }
}

/**
 * ナビメニューを閉じる
 */
function closeNavMenu() {
  const popover = document.getElementById('navPopover');
  if (popover) {
    popover.classList.remove('active');
  }
}

/**
 * トップ画面（打刻・ログイン画面）へ遷移
 */
function goToTop() {
  window.location.href = 'dashboard.html';
}

// ナビメニュー外クリックで閉じる
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.nav-menu-wrapper');
  const popover = document.getElementById('navPopover');
  if (wrapper && popover && !wrapper.contains(e.target)) {
    popover.classList.remove('active');
  }
});

// ==========================
// タブレットモード
// ==========================

/**
 * タブレットモードの初期化
 */
function initTabletMode() {
  const isTabletMode = localStorage.getItem('tablet_mode') === 'true';
  const html = document.documentElement;

  if (isTabletMode) {
    html.classList.add('tablet-mode');
    // 全てのタブレットモードボタンをアクティブ状態にする
    document.querySelectorAll('.btn-tablet-mode').forEach(btn => btn.classList.add('active'));

    // PCモードボタンを表示
    const btnPcMode = document.getElementById('btnPcMode');
    if (btnPcMode) btnPcMode.style.display = 'flex';
    const btnTabletMode = document.getElementById('btnTabletMode');
    if (btnTabletMode) btnTabletMode.style.display = 'none';
  }
}

/**
 * タブレットモードの切り替え
 */
function toggleTabletMode() {
  window.location.href = 'tablet-selection.html';
}

/**
 * PCモードに切り替え
 */
function switchToPcMode() {
  const html = document.documentElement;
  html.classList.remove('tablet-mode');
  localStorage.setItem('tablet_mode', 'false');

  // ボタンの状態を同期
  const btnPcMode = document.getElementById('btnPcMode');
  if (btnPcMode) btnPcMode.style.display = 'none';
  const btnTabletMode = document.getElementById('btnTabletMode');
  if (btnTabletMode) btnTabletMode.style.display = 'flex';

  showToast('PCモードに切り替えました', 'info');
}

// ==========================
// ページ初期化
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initTabletMode();
});
