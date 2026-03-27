document.addEventListener('DOMContentLoaded', async () => {
    await loadGroups();
});

/**
 * 拠点（ベース）一覧を読み込み
 */
async function loadGroups() {
    const grid = document.querySelector('.selection-grid');
    if (!grid) return;

    try {
        const bases = await Api.get('/attendance/bases');
        grid.innerHTML = '';

        bases.forEach((base, index) => {
            const name = base.name || base.Name || "";
            const id = base.id || base.Id || "";
            
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.onclick = () => selectBase(id, name);

            // 背景色のバリエーション
            const colors = ['#f8c9d9', '#ffcd94', '#addb8a', '#bfefff'];
            const color = colors[index % colors.length];

            // 拠点名に応じた画像の取得
            let imgSrc = 'assets/facility_default.png';
            if (name.includes('さぬき') && !name.includes('森')) imgSrc = 'assets/facility_sanuki.jpg';
            else if (name.includes('玉藻')) imgSrc = 'assets/facility_tamamoso.jpg';
            else if (name.includes('森')) imgSrc = 'assets/facility_mori.png';
            else if (name.includes('番丁')) imgSrc = 'assets/facility_shinbancho.png';

            item.innerHTML = `
                <div class="selection-box" style="background-color: ${color};">${name}</div>
                <img src="${imgSrc}" alt="${name}" class="selection-image" 
                     onerror="this.src='https://via.placeholder.com/200x120?text=${encodeURIComponent(name)}'">
            `;
            grid.appendChild(item);
        });
    } catch (err) {
        console.error('拠点取得失敗:', err);
    }
}

/**
 * 拠点を選択してグループ選択画面へ
 */
function selectBase(baseId, baseName) {
    localStorage.setItem('selected_base_id', baseId);
    localStorage.setItem('selected_base_name', baseName);
    window.location.href = 'tablet-member-selection.html';
}

/**
 * PCモードに切り替えてログイン画面に戻る
 */
function switchToPcModeSelection() {
    localStorage.setItem('tablet_mode', 'false');
    window.location.href = 'index.html';
}
