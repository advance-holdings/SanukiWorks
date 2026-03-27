/**
 * 勤怠システム - タブレットメンバー選択画面ロジック
 */

document.addEventListener('DOMContentLoaded', () => {
    const baseId = localStorage.getItem('selected_base_id');
    const baseName = localStorage.getItem('selected_base_name') || "メンバーを選択";
    
    if (!baseId) {
        window.location.href = 'tablet-selection.html';
        return;
    }

    // ヘッダーの拠点名更新
    const nameEl = document.getElementById('selectedGroupName');
    if (nameEl) nameEl.textContent = baseName;

    loadMembers(baseId);
    startClock();
});

/**
 * 時計の開始
 */
function startClock() {
    function update() {
        const now = new Date();
        const dateEl = document.getElementById('tabletDate');
        const timeEl = document.getElementById('tabletTime');

        if (dateEl) {
            const days = ['日', '月', '火', '水', '木', '金', '土'];
            const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日(${days[now.getDay()]})`;
            dateEl.textContent = dateStr;
        }

        if (timeEl) {
            const timeStr = now.toLocaleTimeString('ja-JP', { hour12: false });
            timeEl.textContent = timeStr;
        }
    }

    update();
    setInterval(update, 1000);
}

/**
 * メンバー一覧を読み込み
 * @param {string} baseId 
 */
async function loadMembers(baseId) {
    const grid = document.getElementById('memberGrid');
    if (!grid) return;

    try {
        const members = await Api.get(`/attendance/members/base/${baseId}`);
        grid.innerHTML = '';

        members.forEach(member => {
            const name = member.name || member.Name || "";
            const id = member.id || member.Id || member.社員番号 || "";
            
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.style.position = 'relative';
            // 修正：メンバー情報（オブジェクト）を渡す
            item.onclick = () => selectMember({ name, id });

            const box = document.createElement('div');
            box.className = 'selection-box';
            box.style.marginBottom = '0';
            box.style.aspectRatio = 'auto';
            box.style.padding = '24px 10px';
            box.style.fontSize = '1.8rem';

            // 勤務状態に応じた配色
            box.style.backgroundColor = '#f8c9d9'; // デフォルトはピンク

            box.textContent = name;
            item.appendChild(box);

            grid.appendChild(item);
        });
    } catch (err) {
        console.error('メンバー一覧の取得に失敗:', err);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">メンバーが取得できませんでした</p>';
    }
}

/**
 * メンバーを選択して詳細画面に遷移
 * @param {object} member 
 */
function selectMember(member) {
    localStorage.setItem('selected_member', JSON.stringify(member));
    window.location.href = 'tablet-clock.html';
}
