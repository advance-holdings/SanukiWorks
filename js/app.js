/**
 * ASサービス申込フォーム - ロジック
 */

// ==========================
// 設定
// ==========================
const CONFIG = {
    // API_BASE_URL: 'http://localhost:5050/api', // ローカルでのみ動かす場合
    API_BASE_URL: 'http://192.168.10.143:5050/api', // 別端末からもアクセスさせる場合
    USE_MOCK: false,
};

// IME変換中フラグ
let isComposing = false;

// フリガナ自動入力
let autokanaCompany, autokanaRep, autokanaContact;

// ==========================
// 初期化
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
    // ログインチェック
    const user = sessionStorage.getItem('as_login_user');
    if (sessionStorage.getItem('as_logged_in') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // AutoKana初期化
    if (window.AutoKana) {
        autokanaCompany = AutoKana.bind('#companyName', '#companyKana', { katakana: true });
        autokanaRep = AutoKana.bind('#representativeName', '#representativeKana', { katakana: true });
        autokanaContact = AutoKana.bind('#contactName', '#contactKana', { katakana: true });
    }

    // Flatpickr初期化（日本語設定）
    flatpickr.localize(flatpickr.l10ns.ja);
    const fpConfig = {
        locale: "ja",
        dateFormat: "Y-m-d",
        allowInput: true,
        altInput: true,
        altFormat: "Y年m月d日",
    };

    // 全ての日付入力フィールドに適用
    const dateInputs = document.querySelectorAll('#applicationDate, #registrationDate');
    dateInputs.forEach(el => {
        const fp = flatpickr(el, {
            ...fpConfig,
            onChange: function (selectedDates, dateStr, instance) {
                // 必要に応じて後続処理
            }
        });

        // 8桁数字入力をサポートするイベント
        el.addEventListener('blur', function (e) {
            const val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length === 8) {
                const y = val.substring(0, 4);
                const m = val.substring(4, 6);
                const d = val.substring(6, 8);
                const dateStr = `${y}-${m}-${d}`;
                if (!isNaN(Date.parse(dateStr))) {
                    fp.setDate(dateStr);
                }
            }
        });
    });

    // URLパラメータ取得
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const stage = params.get('stage');

    setDefaultDate();
    setupPdfDropZone();

    if (id) {
        // 既存データの読み込みと復元
        await loadExistingData(id, stage);
        const labelEl = document.querySelector('.section-header:nth-of-type(9) .required');
        if (labelEl) labelEl.textContent = (stage == '2') ? '※必須' : '(任意)';
    } else {
        // 新規申込 (1次申込)
        addStoreEntry(); // 初期1行
        addProductEntry(); // 商品行の初期1行
        addContractRow(); // 契約行の初期1行

        // 物件金額セクションを無効化 (1次申込時は入力不可)
        togglePropertySection(false);
        const labelEl = document.querySelector('.section-header:nth-of-type(9) .required');
        if (labelEl) labelEl.textContent = '(任意)';
    }

    // IME変換の監視
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('compositionstart', () => { isComposing = true; });
        input.addEventListener('compositionend', () => {
            isComposing = false;
            // 変換確定時に一度バリデーションを走らせる
            if (input.oninput) input.dispatchEvent(new Event('input'));
        });
    });
});

/**
 * 既存データの読み込み
 */
async function loadExistingData(id, stage) {
    const apps = JSON.parse(localStorage.getItem('as_applications') || '[]');
    const data = apps.find(a => a.id == id);
    if (!data) {
        showToast('データが見つかりません', 'error');
        return;
    }

    fillFormData(data);

    // ステージに応じた制御
    if (stage == '2') {
        togglePropertySection(true); // 2次申込時は物件金額を有効化
    } else {
        togglePropertySection(false); // それ以外（編集等）は念のため無効化
    }
}

/**
 * 物件金額セクションの有効/無効切り替え
 */
function togglePropertySection(enabled) {
    const section = document.getElementById('propertySection');
    if (!section) return;

    const inputs = section.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.disabled = !enabled;
        if (!enabled) {
            input.style.backgroundColor = '#f1f1f1';
            input.style.cursor = 'not-allowed';
        } else {
            input.style.backgroundColor = '';
            input.style.cursor = '';
        }
    });

    // 2次申込時のヒント表示
    if (enabled) {
        const header = section.previousElementSibling;
        if (header) header.innerHTML += ' <span style="font-size:0.75rem; color:#e74c3c; font-weight:normal;">(2次申込: 入力可能になりました)</span>';
    }
}

/**
 * ログアウト
 */
function handleLogout() {
    sessionStorage.removeItem('as_logged_in');
    sessionStorage.removeItem('as_login_user');
    window.location.href = 'login.html';
}

/**
 * 今日の日付をセット
 */
function setDefaultDate() {
    const dateInput = document.getElementById('applicationDate');
    if (dateInput) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${y}-${m}-${d}`;
    }
}

// ==========================
// ②店舗情報 - 動的追加/削除
// ==========================
let storeCount = 0;

function addStoreEntry() {
    const container = document.getElementById('storeContainer');
    if (!container) return;

    storeCount++;
    const entry = document.createElement('div');
    entry.className = 'store-entry';
    entry.id = `store-${storeCount}`;
    const storeNameId = `storeName-${storeCount}`;
    const storeKanaId = `storeKana-${storeCount}`;

    entry.innerHTML = `
    <button type="button" class="btn-remove-store" onclick="removeStoreEntry('store-${storeCount}')" title="削除">✕</button>
    <div class="store-row">
      <input type="text" id="${storeNameId}" placeholder="店舗名称" class="input-lg">
      <input type="text" id="${storeKanaId}" placeholder="店舗名カナ" oninput="validateKatakana(this)">
      <input type="text" placeholder="電話番号" class="input-md" inputmode="numeric" oninput="validateNumeric(this)">
    </div>
    <div class="store-row">
      <input type="text" placeholder="郵便番号" class="input-xs" maxlength="8" id="storePostal${storeCount}" inputmode="numeric" oninput="validateNumeric(this)">
      <button type="button" class="btn btn-secondary btn-sm" onclick="searchAddress('storePostal${storeCount}','storePref${storeCount}','storeCity${storeCount}','storeTown${storeCount}')">検索</button>
      <input type="text" placeholder="都道府県" class="input-xs" id="storePref${storeCount}">
      <input type="text" placeholder="市区郡" class="input-sm" id="storeCity${storeCount}">
      <input type="text" placeholder="町域" class="input-sm" id="storeTown${storeCount}">
      <input type="text" placeholder="丁目番号" class="input-sm">
    </div>
  `;

    container.appendChild(entry);

    // 店舗名にもAutoKanaを適用
    if (window.AutoKana) {
        AutoKana.bind(`#${storeNameId}`, `#${storeKanaId}`, { katakana: true });
    }

    container.scrollTop = container.scrollHeight;
}

function removeStoreEntry(id) {
    const entry = document.getElementById(id);
    if (entry) {
        entry.remove();
    }
}

// ==========================
// ④商品情報 - 動的追加/削除
// ==========================
let productCount = 0;

function addProductEntry() {
    const container = document.getElementById('productContainer');
    if (!container) return;

    productCount++;
    const entry = document.createElement('div');
    entry.className = 'store-entry';
    entry.id = `product-${productCount}`;
    entry.innerHTML = `
    <button type="button" class="btn-remove-store" onclick="removeProductEntry('product-${productCount}')" title="削除">✕</button>
    <div class="store-row">
      <select class="product-plan input-md" onchange="onProductChange(this)">
        <option value="">選択してください</option>
        <option value="AS">AS</option>
        <option value="EC機能">EC機能</option>
        <option value="求人ページ">求人ページ</option>
      </select>
      <span class="sub-label">初期費用単価</span>
      <input type="number" class="product-unit-price input-sm" value="0" min="0" oninput="calcProductSubtotal(this)">
      <span class="sub-label">数量</span>
      <input type="number" class="product-quantity input-xs" value="1" min="0" oninput="calcProductSubtotal(this)">
      <span class="sub-label">合計</span>
      <input type="text" class="product-subtotal input-sm" value="0" readonly style="background:var(--bg-gray);">
    </div>
    <div class="store-row">
      <span class="sub-label">備考</span>
      <input type="text" class="product-remark" style="flex:1;">
    </div>
  `;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function removeProductEntry(id) {
    const entry = document.getElementById(id);
    if (entry) entry.remove();
}

function onProductChange(select) {
    // 将来的にプランに応じた初期費用の自動セット等に使用可能
}

function calcProductSubtotal(input) {
    const entry = input.closest('.store-entry');
    if (!entry) return;
    const price = parseInt(entry.querySelector('.product-unit-price').value) || 0;
    const qty = parseInt(entry.querySelector('.product-quantity').value) || 0;
    const subtotal = entry.querySelector('.product-subtotal');
    if (subtotal) subtotal.value = (price * qty).toLocaleString();
}

// ==========================
// ⑤AS契約情報 - 動的行追加
// ==========================
let contractRowCount = 0;

function addContractRow() {
    const tbody = document.getElementById('contractTableBody');
    if (!tbody) return;

    contractRowCount++;
    const tr = document.createElement('tr');
    tr.id = `contract-row-${contractRowCount}`;
    tr.innerHTML = `
      <td><button type="button" style="background:none;border:none;color:var(--primary-red);cursor:pointer;font-size:0.9rem;" onclick="removeContractRow('contract-row-${contractRowCount}')">✕</button></td>
      <td>
        <select class="contract-service" style="width:100%;">
          <option value="">選択</option>
          <option value="ASサービス" selected>ASサービス</option>
        </select>
      </td>
      <td><input type="text" class="contract-free-period" placeholder="1か月" style="width:100%;"></td>
      <td><input type="text" class="contract-period" placeholder="12か月" style="width:100%;"></td>
      <td><input type="number" class="contract-unit-price" value="0" min="0" oninput="calcContractTotal(this)"></td>
      <td><input type="number" class="contract-quantity" value="1" min="0" oninput="calcContractTotal(this)"></td>
      <td><input type="text" class="contract-total" value="0" readonly style="background:var(--bg-gray);"></td>
      <td><input type="text" class="contract-remark"></td>
    `;
    tbody.appendChild(tr);
}

function removeContractRow(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
}

function calcContractTotal(input) {
    const tr = input.closest('tr');
    if (!tr) return;
    const price = parseInt(tr.querySelector('.contract-unit-price').value) || 0;
    const qty = parseInt(tr.querySelector('.contract-quantity').value) || 0;
    const total = tr.querySelector('.contract-total');
    if (total) total.value = (price * qty).toLocaleString();
}

// ==========================
// 郵便番号 → 住所自動入力
// ==========================
async function searchAddress(postalId, prefId, cityId, townId) {
    const postalInput = document.getElementById(postalId);
    if (!postalInput) return;

    const postal = postalInput.value.replace(/[^0-9]/g, '');
    if (postal.length !== 7) {
        showToast('7桁の郵便番号を入力してください', 'error');
        return;
    }

    try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postal}`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const r = data.results[0];
            const prefInput = document.getElementById(prefId);
            const cityInput = document.getElementById(cityId);
            const townInput = document.getElementById(townId);
            if (prefInput) prefInput.value = r.address1;
            if (cityInput) cityInput.value = r.address2;
            if (townInput) townInput.value = r.address3;
            showToast('住所を取得しました', 'success');
        } else {
            showToast('該当する住所が見つかりません', 'error');
        }
    } catch (e) {
        console.error('住所検索エラー:', e);
        showToast('住所検索に失敗しました', 'error');
    }
}

// ==========================
// ⑧PDF添付
// ==========================
let selectedPdfFile = null;

function setupPdfDropZone() {
    const dropZone = document.getElementById('pdfDropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(ev => {
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    });
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) processPdfFile(file);
    });
}

function handlePdfSelect(event) {
    const file = event.target.files[0];
    if (file) processPdfFile(file);
}

function processPdfFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('PDFファイルのみ添付可能です', 'error');
        return;
    }
    selectedPdfFile = file;

    // ファイル情報表示
    document.getElementById('pdfFileName').textContent = file.name;
    document.getElementById('pdfFileSize').textContent = formatFileSize(file.size);

    // プレビュー表示
    const url = URL.createObjectURL(file);
    document.getElementById('pdfPreviewFrame').src = url;

    document.getElementById('pdfDropZone').style.display = 'none';
    document.getElementById('pdfPreviewArea').style.display = 'block';
}

function removePdf() {
    selectedPdfFile = null;
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('pdfPreviewFrame').src = '';
    document.getElementById('pdfDropZone').style.display = '';
    document.getElementById('pdfPreviewArea').style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ==========================
// ステップ遷移
// ==========================
function setStep(step) {
    const s1 = document.getElementById('stepInd1');
    const s2 = document.getElementById('stepInd2');
    const s3 = document.getElementById('stepInd3');
    const l1 = document.getElementById('stepLine1');
    const l2 = document.getElementById('stepLine2');

    [s1, s2, s3].forEach(s => { s.className = 'step'; });
    [l1, l2].forEach(l => { l.className = 'step-line'; });

    if (step === 1) {
        s1.classList.add('active');
    } else if (step === 2) {
        s1.classList.add('done');
        l1.classList.add('done');
        s2.classList.add('active');
    } else if (step === 3) {
        s1.classList.add('done');
        l1.classList.add('done');
        s2.classList.add('done');
        l2.classList.add('done');
        s3.classList.add('active');
    }
}

function goToConfirm() {
    const params = new URLSearchParams(window.location.search);
    const stage = params.get('stage');

    // PDF必須チェック (2次申込時のみ必須)
    if (stage == '2' && !selectedPdfFile) {
        showToast('2次申込ではPDF書類の添付は必須です', 'error');
        document.getElementById('pdfDropZone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    // バリデーション
    const errors = validateForm();
    if (errors.length > 0) {
        showToast(errors[0], 'error');
        return;
    }

    // 確認画面HTML生成
    const html = buildConfirmHtml();
    document.getElementById('confirmContent').innerHTML = html;

    // 画面切替
    document.getElementById('step-input').style.display = 'none';
    document.getElementById('step-confirm').style.display = '';
    document.getElementById('step-complete').style.display = 'none';
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToInput() {
    document.getElementById('step-input').style.display = '';
    document.getElementById('step-confirm').style.display = 'none';
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildConfirmHtml() {
    const h = (label, value) => `<tr><th>${label}</th><td>${value || '―'}</td></tr>`;
    const cb = (id) => checked(id) ? '✓' : '―';
    let html = '';

    // ①お申込み情報
    html += '<div class="confirm-section-title">①お申込み情報</div>';
    html += '<table class="confirm-table">';
    html += h('お申込日', val('applicationDate'));
    const appType = document.getElementById('applicationType');
    html += h('申込種別', appType ? appType.options[appType.selectedIndex]?.text : '');
    html += h('法人名/屋号', val('companyName'));
    html += h('法人名/屋号カナ', val('companyKana'));
    html += h('代表者名', val('representativeName'));
    html += h('代表者名カナ', val('representativeKana'));
    html += h('担当者名', val('contactName'));
    html += h('担当者名カナ', val('contactKana'));
    html += h('電話番号', val('phone'));
    html += h('FAX', val('fax'));
    html += h('電話番号2', val('phone2'));
    html += h('メールアドレス', val('email'));
    html += h('郵便番号', val('postalCode'));
    html += h('住所', `${val('prefecture')} ${val('city')} ${val('town')} ${val('block')} ${val('additionalAddress')}`);
    html += '</table>';

    // ②店舗情報
    const stores = collectStoreData();
    if (stores.length > 0) {
        html += '<div class="confirm-section-title">②店舗情報</div>';
        stores.forEach((s, i) => {
            html += `<table class="confirm-table">`;
            html += h(`店舗${i + 1} 名称`, s.storeName);
            html += h('フリガナ', s.storeKana);
            html += h('電話番号', s.storePhone);
            html += h('住所', `${s.storePostal} ${s.storePrefecture} ${s.storeCity} ${s.storeTown}`);
            html += '</table>';
        });
    }

    // ③請求情報
    html += '<div class="confirm-section-title">③請求情報</div>';
    html += '<table class="confirm-table">';
    html += h('請求先', [
        checked('billingCompany') ? '法人' : '',
        checked('billingStore') ? '店舗' : '',
        checked('billingExisting') ? '既存' : ''
    ].filter(Boolean).join('、') || '―');
    html += '</table>';

    // ④商品情報
    const products = collectProductData();
    if (products.length > 0) {
        html += '<div class="confirm-section-title">④商品情報</div>';
        products.forEach((p, i) => {
            html += `<table class="confirm-table">`;
            html += h(`商品${i + 1} プラン`, p.name);
            html += h('初期費用単価', p.unitPrice.toLocaleString() + '円');
            html += h('数量', p.quantity);
            html += h('備考', p.remark);
            html += '</table>';
        });
    }

    // ⑤AS契約情報
    const contracts = collectContractData();
    if (contracts.length > 0) {
        html += '<div class="confirm-section-title">⑤AS契約情報</div>';
        contracts.forEach((c, i) => {
            html += `<table class="confirm-table">`;
            html += h(`契約${i + 1} サービス名`, c.service);
            html += h('無料期間', c.freePeriod);
            html += h('契約期間', c.contractPeriod);
            html += h('月額単価', c.unitPrice.toLocaleString() + '円');
            html += h('数量', c.quantity);
            html += h('備考', c.remark);
            html += '</table>';
        });
    }

    // ⑥契約物件金額
    html += '<div class="confirm-section-title">⑥契約物件金額</div>';
    html += '<table class="confirm-table">';
    html += h('販売物件金額', (parseInt(val('propertyPrice')) || 0).toLocaleString() + '円');
    html += h('支払方法', [
        checked('payCash') ? '現金一括' : '',
        checked('payInstallment') ? '割賦' : ''
    ].filter(Boolean).join('、') || '―');
    html += h('初回分割支払金額', (parseInt(val('firstInstallment')) || 0).toLocaleString() + '円');
    html += h('2回目以降分割支払金額', (parseInt(val('subsequentInstallment')) || 0).toLocaleString() + '円');
    html += h('支払い回数', val('installmentCount') ? val('installmentCount') + '回' : '―');
    html += '</table>';

    // ⑦ドメイン情報
    html += '<div class="confirm-section-title">⑦ドメイン情報</div>';
    html += '<table class="confirm-table">';
    html += h('メールアドレス', val('domainEmail'));
    html += h('登記年月日', val('registrationDate'));
    html += h('ドメイン区分', [
        checked('domainNew') ? '新規' : '',
        checked('domainTransfer') ? '移行' : ''
    ].filter(Boolean).join('、') || '―');
    html += h('ドメイン欄', val('domainName'));
    const tlds = [
        checked('tldCom') ? '.com' : '',
        checked('tldNet') ? '.net' : '',
        checked('tldInfo') ? '.info' : '',
        checked('tldJp') ? '.jp' : '',
        checked('tldOther') ? ('その他: ' + val('tldOtherValue')) : ''
    ].filter(Boolean).join('、');
    html += h('TLD', tlds || '―');
    html += h('英文表記', val('domainEnglish'));
    const suffixes = [
        checked('suffixCoLtd') ? '.co.ltd' : '',
        checked('suffixInc') ? '.inc' : ''
    ].filter(Boolean).join('、');
    html += h('英文表記種別', suffixes || '―');
    html += '</table>';

    // ⑧ 申込担当者情報
    html += '<div class="confirm-section-title">⑧ 申込担当者情報</div>';
    html += '<table class="confirm-table">';
    html += h('営業担当者氏名', val('salesRepName'));
    html += h('営業担当者メールアドレス', val('salesRepEmail'));
    html += h('お客様氏名', val('signerName'));
    html += h('お客様メールアドレス', val('signerEmail'));
    html += '</table>';

    // ⑨ 添付書類
    html += '<div class="confirm-section-title">⑨ 添付書類</div>';
    html += '<table class="confirm-table">';
    html += h('ファイル名', selectedPdfFile ? selectedPdfFile.name : '―');
    html += h('サイズ', selectedPdfFile ? formatFileSize(selectedPdfFile.size) : '―');
    html += '</table>';

    return html;
}

// ==========================
// フォーム送信
// ==========================
async function submitForm() {
    const formData = await collectFormData();
    const params = new URLSearchParams(window.location.search);
    const existingId = params.get('id');
    const stage = params.get('stage');

    // LocalStorageに蓄積
    const stored = JSON.parse(localStorage.getItem('as_applications') || '[]');

    let status = '1次申込完了';
    if (stage == '2') {
        status = '申込完了';
    }

    let finalEntry;
    if (existingId) {
        // 更新
        const idx = stored.findIndex(a => a.id == existingId);
        if (idx !== -1) {
            stored[idx] = {
                ...stored[idx],
                ...formData,
                status: status,
                updatedAt: new Date().toISOString()
            };
            finalEntry = stored[idx];
        }
    } else {
        // 新規
        finalEntry = {
            id: "", // バックエンドで採番させるため空文字を指定
            status: status,
            pdfFileName: selectedPdfFile ? selectedPdfFile.name : '',
            pdfFileSize: selectedPdfFile ? selectedPdfFile.size : 0,
            pdfBase64: formData.pdfBase64 || '', // Base64データを格納
            submittedAt: new Date().toISOString(),
            submittedBy: sessionStorage.getItem('as_login_user'),
            ...formData,
        };
        stored.push(finalEntry);
    }
    // API送信前にはまだ localStorage に保存しない

    // C#側は string 型を期待するため、数値型だった場合は文字列に変換
    if (finalEntry.id !== undefined && finalEntry.id !== null) {
        finalEntry.id = String(finalEntry.id);
    }

    console.log('送信データ:', finalEntry);

    // APIへデータを送信 (SQL Serverへ保存)
    const apiResult = await saveApplicationToApi(finalEntry);
    if (!apiResult) {
        // 保存失敗時はここで止める（ローカルにも保存しない）
        return;
    }

    // バックエンドからIDが返ってきた場合は割り当てる
    if (typeof apiResult === 'string' && apiResult !== 'true') {
        finalEntry.id = apiResult;
    } else if (!finalEntry.id) {
        // 万が一何もない場合はローカル仮ID
        finalEntry.id = Date.now().toString();
    }

    // API保存成功後、はじめて localStorage に保存・更新する
    if (idx === -1) {
        stored.push(finalEntry);
    }
    localStorage.setItem('as_applications', JSON.stringify(stored));

    // メール本文を組み立て
    const emailBody = buildEmailBody(formData);
    const emailSubject = '【ASホームページ】お申込みありがとうございます。';

    // 添付ファイルがある場合は Base64 変換して送信
    if (selectedPdfFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64Data = e.target.result.split(',')[1];
            sendMail(emailSubject, emailBody, formData.signerEmail, formData.salesRepEmail, base64Data, selectedPdfFile.name);
        };
        reader.readAsDataURL(selectedPdfFile);
    } else {
        sendMail(emailSubject, emailBody, formData.signerEmail, formData.salesRepEmail);
    }

    showToast('申込データを送信しました', 'success');

    // 完了画面へ
    const titleEl = document.getElementById('complete-title');
    const msgEl = document.getElementById('complete-message');
    if (stage == '2') {
        titleEl.textContent = '本申込が完了しました';
        msgEl.innerHTML = '本申込みのお手続きがすべて完了いたしました。<br>これより本登録作業を進めさせていただきます。';
    } else {
        titleEl.textContent = '1次申込が完了しました';
        msgEl.innerHTML = '1次申込み（新規登録）を受け付けました。<br>引き続き、物件金額等の詳細情報の入力（本申込）をお願いいたします。';
    }

    document.getElementById('step-input').style.display = 'none';
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-complete').style.display = '';
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * データをバックエンドAPIに送信して保存
 */
async function saveApplicationToApi(data) {
    try {
        const response = await fetch(CONFIG.API_BASE_URL + '/Application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('DB保存失敗(HTTPエラー):', response.status, errText);
            alert('サーバーとの通信に失敗しました（' + response.status + 'エラー）。\n' + errText);
            return false;
        }

        const result = await response.json();
        if (result.success) {
            console.log('DB保存成功:', result.message);
            return result.applicationId || true;
        } else {
            console.error('DB保存失敗:', result.message);
            alert('データベースへの保存に失敗しました:\n' + result.message);
            return false;
        }
    } catch (err) {
        console.error('API通信エラー:', err);
        alert('サーバーに接続できませんでした。バックエンドが起動しているか確認してください。');
        return false;
    }
}


/**
 * メール送信実行
 */
function sendMail(subject, body, to, cc, attachment = null, attachmentName = null) {
    const payload = { subject, body, to, cc };
    if (attachment) {
        payload.attachment = attachment;
        payload.attachmentName = attachmentName;
    }

    fetch(CONFIG.API_BASE_URL + '/application/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                console.log('メール送信成功:', result.message);
            } else {
                console.warn('メール送信失敗:', result.message);
            }
        })
        .catch(err => {
            console.warn('メール送信エラー:', err);
        })
        .catch(err => {
            console.warn('メール送信エラー:', err);
        });
}

function buildEmailBody(d) {
    const L = [];
    L.push('お申込みありがとうございます。');
    L.push('※※※※※※※※※※※※※※※※※');

    const addr = [d.prefecture, d.city, d.town, d.block, d.additionalAddress].filter(Boolean).join('');

    L.push(`申込日：${d.applicationDate || ''}`);
    L.push(`申込種別：${d.applicationType || ''}`);
    L.push(`企業名：${d.companyName || ''}`);
    L.push(`企業名ﾌﾘｶﾞﾅ：${d.companyKana || ''}`);
    L.push(`郵便番号：${d.postalCode || ''}`);
    L.push(`契約住所：${addr}`);
    L.push(`電話番号：${d.phone || ''}`);
    L.push(`FAX：${d.fax || ''}`);
    L.push(`代表者名：${d.representativeName || ''}`);
    L.push(`代表者名ｶﾅ：${d.representativeKana || ''}`);
    L.push(`担当者名：${d.contactName || ''}`);
    L.push(`担当者ｶﾅ：${d.contactKana || ''}`);
    L.push(`担当者所属部署連絡先：${d.phone2 || ''}`);
    L.push(`担当者携帯電話番号：${d.phone2 || ''}`);
    L.push(`担当者メール：${d.email || ''}`);

    // 店舗情報
    const stores = d.stores || [];
    L.push(`申込店舗数：${stores.length}`);
    for (let i = 0; i < 3; i++) {
        const idx = i + 1;
        if (i < stores.length) {
            const s = stores[i];
            const sAddr = [s.postalCode ? '' : '', s.prefecture, s.city, s.town, s.block].filter(Boolean).join('');
            L.push(`店舗名${idx}：${s.storeName || ''}`);
            L.push(`店舗ﾌﾘｶﾞﾅ${idx}：${s.storeKana || ''}`);
            L.push(`店舗郵便番号${idx}：${s.postalCode || ''}`);
            L.push(`店舗住所${idx}：${sAddr}`);
            L.push(`店舗TEL${idx}：${s.storePhone || ''}`);
            L.push(`店舗FAX${idx}：`);
        } else {
            L.push(`店舗名${idx}：`);
            L.push(`店舗ﾌﾘｶﾞﾅ${idx}：`);
            L.push(`店舗郵便番号${idx}：`);
            L.push(`店舗住所${idx}：`);
            L.push(`店舗TEL${idx}：`);
            L.push(`店舗FAX${idx}：`);
        }
    }

    // 請求
    const billing = d.billing || {};
    let billText = '';
    if (billing.company) billText = '企業宛';
    else if (billing.store) billText = '店舗宛';
    else if (billing.existing) billText = '既存宛';
    L.push(`請求に関して：${billText}`);

    // 商品・契約
    const products = d.products || [];
    const contractRows = (d.contract && d.contract.rows) || [];

    const planNames = ['AS', 'EC機能', '求人ページ'];
    planNames.forEach((pn, pi) => {
        const prod = products.find(p => p.name === pn);
        const cont = pi < contractRows.length ? contractRows[pi] : null;

        L.push(`${pn}無料期間：${cont ? cont.freePeriod || '' : ''}`);
        L.push(`${pn}契約期間：${cont ? cont.contractPeriod || '' : ''}`);
        const iup = prod ? (prod.unitPrice || 0) : 0;
        const iq = prod ? (prod.quantity || 0) : 0;
        L.push(`${pn}初期費用単価：${iup > 0 ? iup : ''}`);
        L.push(`${pn}数量：${iq > 0 ? iq : ''}`);
        L.push(`${pn}初期費用総額：${iup * iq > 0 ? iup * iq : ''}`);
        const mup = cont ? (cont.unitPrice || 0) : 0;
        const mq = cont ? (cont.quantity || 0) : 0;
        L.push(`${pn}月額単価：${mup > 0 ? mup : ''}`);
        L.push(`${pn}月額数量：${mq > 0 ? mq : ''}`);
        L.push(`${pn}月額総額：${mup * mq > 0 ? mup * mq : ''}`);
    });

    L.push('インスタ連携月額単価：');
    L.push('インスタ連携数量：');
    L.push('インスタ連携月額総額：');
    L.push('サービス名：');
    L.push('ASオプション月額単価：');
    L.push('ASオプション数量：');
    L.push('ASオプション月額総額：');

    // 契約物件金額
    const prop = d.propertyAmount || {};
    L.push(`販売物件合計：${prop.propertyPrice || ''}`);
    const pm = [];
    if (prop.payCash) pm.push('現金一括');
    if (prop.payInstallment) pm.push('割賦');
    L.push(`支払方法：${pm.join('、')}`);
    L.push(`初回分割支払金額：${prop.firstInstallment || ''}`);
    L.push(`2回目以降分割支払金額：${prop.subsequentInstallment || ''}`);
    L.push(`支払い回数：${prop.installmentCount || ''}`);

    // ドメイン情報
    const dom = d.domain || {};
    L.push(`メールアドレス：${dom.email || ''}`);
    L.push(`登記年月日：${dom.registrationDate || ''}`);
    const dc = [];
    if (dom.domainNew) dc.push('新規');
    if (dom.domainTransfer) dc.push('移行');
    L.push(`ドメイン区分：${dc.join('、')}`);
    L.push(`ドメイン欄：${dom.domainName || ''}`);
    L.push(`英文表記：${dom.englishName || ''}`);

    // 末尾
    L.push(`申込日：${d.applicationDate || ''}`);
    L.push(`営業担当者氏名：${d.salesRepName || ''}`);
    L.push(`営業担当者メールアドレス：${d.salesRepEmail || ''}`);
    L.push(`お客様氏名：${d.signerName || ''}`);
    L.push(`お客様メールアドレス：${d.signerEmail || ''}`);
    L.push('※※※※※※※※※※※※※※※※※');

    return L.join('\r\n');
}

function goToComplete() {
    document.getElementById('step-input').style.display = 'none';
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-complete').style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * 入力制限：数字のみ
 * @param {HTMLInputElement} input 
 */
function validateNumeric(input) {
    input.value = input.value.replace(/[^\d]/g, '');
}

/**
 * 入力制限：カタカナのみ（全角・半角・長音含む）
 * @param {HTMLInputElement} input 
 */
function validateKatakana(input) {
    if (isComposing) return; // IME変換中はバリデーションをスキップ
    // 全角カタカナ: \u30A1-\u30F6
    // 半角カタカナ: \uFF66-\uFF9F
    // 長音記号（全角・半角）: \u30FC, \uFF70
    // 空白も許容する場合は \s を追加
    input.value = input.value.replace(/[^\u30A1-\u30F6\uFF66-\uFF9F\u30FC\uFF70]/g, '');
}
// ==========================
// バリデーション
// ==========================
function validateForm() {
    const errors = [];
    const required = [
        { id: 'applicationDate', label: 'お申込日' },
        { id: 'applicationType', label: '申込種別' },
        { id: 'companyName', label: 'お申込会社名' },
        { id: 'companyKana', label: '会社名フリガナ' },
        { id: 'contactName', label: '担当者名' },
        { id: 'phone', label: '電話番号' },
        { id: 'email', label: 'メールアドレス' },
        { id: 'postalCode', label: '郵便番号' },
        { id: 'prefecture', label: '都道府県' },
    ];

    required.forEach(field => {
        const el = document.getElementById(field.id);
        if (!el || !el.value.trim()) {
            errors.push(`${field.label}を入力してください`);
        }
    });

    return errors;
}

// ==========================
// フォームデータ収集
// ==========================
async function collectFormData() {
    const data = {
        // ①お申込み情報
        applicationDate: val('applicationDate'),
        applicationType: val('applicationType'),
        companyName: val('companyName'),
        companyKana: val('companyKana'),
        representativeName: val('representativeName'),
        representativeKana: val('representativeKana'),
        contactName: val('contactName'),
        contactKana: val('contactKana'),
        phone: val('phone'),
        fax: val('fax'),
        phone2: val('phone2'),
        email: val('email'),
        postalCode: val('postalCode'),
        prefecture: val('prefecture'),
        city: val('city'),
        town: val('town'),
        block: val('block'),
        additionalAddress: val('additionalAddress'),

        // ②店舗情報
        stores: collectStoreData(),

        // ③請求
        billing: {
            company: checked('billingCompany'),
            store: checked('billingStore'),
            existing: checked('billingExisting'),
        },

        // ④商品情報
        products: collectProductData(),

        // ⑤AS契約情報
        contract: {
            rows: collectContractData(),
        },

        // ⑥契約物件金額
        propertyAmount: {
            propertyPrice: parseInt(val('propertyPrice')) || 0,
            payCash: checked('payCash'),
            payInstallment: checked('payInstallment'),
            firstInstallment: parseInt(val('firstInstallment')) || 0,
            subsequentInstallment: parseInt(val('subsequentInstallment')) || 0,
            installmentCount: parseInt(val('installmentCount')) || 0,
        },

        // ⑦ドメイン情報
        domain: {
            email: val('domainEmail'),
            registrationDate: val('registrationDate'),
            domainNew: checked('domainNew'),
            domainTransfer: checked('domainTransfer'),
            domainName: val('domainName'),
            tld: {
                com: checked('tldCom'),
                net: checked('tldNet'),
                info: checked('tldInfo'),
                jp: checked('tldJp'),
                other: checked('tldOther'),
                otherValue: val('tldOtherValue'),
            },
            englishName: val('domainEnglish'),
            suffixCoLtd: checked('suffixCoLtd'),
            suffixInc: checked('suffixInc'),
        },
        // ⑧ 申込担当者情報
        salesRepName: val('salesRepName'),
        salesRepEmail: val('salesRepEmail'),
        signerName: val('signerName'),
        signerEmail: val('signerEmail'),

        // 添付ファイル関連
        pdfFileName: selectedPdfFile ? selectedPdfFile.name : '',
        pdfFileSize: selectedPdfFile ? selectedPdfFile.size : 0,
        pdfBase64: '',
    };

    // PDFが選択されていればBase64に変換
    if (selectedPdfFile) {
        try {
            data.pdfBase64 = await readFileAsBase64(selectedPdfFile);
        } catch (err) {
            console.error('PDF読み込みエラー:', err);
        }
    }

    return data;
}

/**
 * ファイルをBase64形式で読み込む
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * フォームにデータを流し込む
 */
function fillFormData(d) {
    if (!d) return;

    // ①お申込み情報
    setVal('applicationDate', d.applicationDate);
    setVal('applicationType', d.applicationType);
    setVal('companyName', d.companyName);
    setVal('companyKana', d.companyKana);
    setVal('representativeName', d.representativeName);
    setVal('representativeKana', d.representativeKana);
    setVal('contactName', d.contactName);
    setVal('contactKana', d.contactKana);
    setVal('phone', d.phone);
    setVal('fax', d.fax);
    setVal('phone2', d.phone2);
    setVal('email', d.email);
    setVal('postalCode', d.postalCode);
    setVal('prefecture', d.prefecture);
    setVal('city', d.city);
    setVal('town', d.town);
    setVal('block', d.block);
    setVal('additionalAddress', d.additionalAddress);

    // ②店舗情報
    const container = document.getElementById('storeContainer');
    if (container) container.innerHTML = '';
    storeCount = 0;
    if (d.stores && d.stores.length > 0) {
        d.stores.forEach(s => {
            addStoreEntry();
            const last = container.lastElementChild;
            const inputs = last.querySelectorAll('input');
            if (inputs[0]) inputs[0].value = s.storeName || '';
            if (inputs[1]) inputs[1].value = s.storeKana || '';
            if (inputs[2]) inputs[2].value = s.storePhone || '';
            if (inputs[3]) inputs[3].value = s.postalCode || '';
            if (inputs[4]) inputs[4].value = s.prefecture || '';
            if (inputs[5]) inputs[5].value = s.city || '';
            if (inputs[6]) inputs[6].value = s.town || '';
            if (inputs[7]) inputs[7].value = s.block || '';
        });
    }

    // ③請求
    if (d.billing) {
        setCheck('billingCompany', d.billing.company);
        setCheck('billingStore', d.billing.store);
        setCheck('billingExisting', d.billing.existing);
    }

    // ④商品情報
    const prodContainer = document.getElementById('productContainer');
    if (prodContainer) prodContainer.innerHTML = '';
    productCount = 0;
    if (d.products && d.products.length > 0) {
        d.products.forEach(p => {
            addProductEntry();
            const last = prodContainer.lastElementChild;
            const sel = last.querySelector('select');
            const ins = last.querySelectorAll('input');
            if (sel) sel.value = p.name || '';
            if (ins[0]) ins[0].value = p.unitPrice || 0;
            if (ins[1]) ins[1].value = p.quantity || 0;
            if (ins[3]) ins[3].value = p.remark || '';
            // 合計計算
            if (ins[2]) ins[2].value = (p.unitPrice * p.quantity) || 0;
        });
    }

    // ⑤AS契約情報
    const contContainer = document.getElementById('contractTableBody');
    if (contContainer) contContainer.innerHTML = '';
    if (d.contract && d.contract.rows && d.contract.rows.length > 0) {
        d.contract.rows.forEach(c => {
            addContractRow();
            const last = contContainer.lastElementChild;
            const sel = last.querySelector('select');
            const ins = last.querySelectorAll('input');
            if (sel) sel.value = c.service || '';
            if (ins[0]) ins[0].value = c.freePeriod || '';
            if (ins[1]) ins[1].value = c.contractPeriod || '';
            if (ins[2]) ins[2].value = c.unitPrice || 0;
            if (ins[3]) ins[3].value = c.quantity || 0;
            if (ins[5]) ins[5].value = c.remark || '';
            // 月額総額
            if (ins[4]) ins[4].value = (c.unitPrice * c.quantity) || 0;
        });
    }

    // ⑥契約物件金額
    if (d.propertyAmount) {
        setVal('propertyPrice', d.propertyAmount.propertyPrice);
        setCheck('payCash', d.propertyAmount.payCash);
        setCheck('payInstallment', d.propertyAmount.payInstallment);
        setVal('firstInstallment', d.propertyAmount.firstInstallment);
        setVal('subsequentInstallment', d.propertyAmount.subsequentInstallment);
        setVal('installmentCount', d.propertyAmount.installmentCount);
    }

    // ⑦ドメイン情報
    if (d.domain) {
        setVal('domainEmail', d.domain.email);
        setVal('registrationDate', d.domain.registrationDate);
        setCheck('domainNew', d.domain.domainNew);
        setCheck('domainTransfer', d.domain.domainTransfer);
        setVal('domainName', d.domain.domainName);
        if (d.domain.tld) {
            setCheck('tldCom', d.domain.tld.com);
            setCheck('tldNet', d.domain.tld.net);
            setCheck('tldInfo', d.domain.tld.info);
            setCheck('tldJp', d.domain.tld.jp);
            setCheck('tldOther', d.domain.tld.other);
            setVal('tldOtherValue', d.domain.tld.otherValue);
        }
        setVal('domainEnglish', d.domain.englishName);
        setCheck('suffixCoLtd', d.domain.suffixCoLtd);
        setCheck('suffixInc', d.domain.suffixInc);
    }

    // ⑧ 申込担当者情報
    setVal('salesRepName', d.salesRepName);
    setVal('salesRepEmail', d.salesRepEmail);
    setVal('signerName', d.signerName);
    setVal('signerEmail', d.signerEmail);
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function setCheck(id, bool) {
    const el = document.getElementById(id);
    if (el) el.checked = !!bool;
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function checked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function collectStoreData() {
    const stores = [];
    document.querySelectorAll('.store-entry').forEach(entry => {
        const inputs = entry.querySelectorAll('input');
        if (inputs.length < 3) return; // 商品行や契約行をスキップ
        stores.push({
            storeName: inputs[0]?.value || '',
            storeKana: inputs[1]?.value || '',
            storePhone: inputs[2]?.value || '',
            postalCode: inputs[3]?.value || '',
            prefecture: inputs[4]?.value || '',
            city: inputs[5]?.value || '',
            town: inputs[6]?.value || '',
            block: inputs[7]?.value || '',
        });
    });
    return stores;
}

function collectProductData() {
    const products = [];
    document.querySelectorAll('#productContainer .store-entry').forEach(entry => {
        const plan = entry.querySelector('.product-plan');
        const unitPrice = entry.querySelector('.product-unit-price');
        const quantity = entry.querySelector('.product-quantity');
        const remark = entry.querySelector('.product-remark');
        products.push({
            name: plan ? plan.value : '',
            unitPrice: parseInt(unitPrice?.value) || 0,
            quantity: parseInt(quantity?.value) || 0,
            remark: remark?.value || '',
        });
    });
    return products;
}

function collectContractData() {
    const rows = [];
    document.querySelectorAll('#contractTableBody tr').forEach(tr => {
        rows.push({
            service: tr.querySelector('.contract-service')?.value || '',
            freePeriod: tr.querySelector('.contract-free-period')?.value || '',
            contractPeriod: tr.querySelector('.contract-period')?.value || '',
            unitPrice: parseInt(tr.querySelector('.contract-unit-price')?.value) || 0,
            quantity: parseInt(tr.querySelector('.contract-quantity')?.value) || 0,
            remark: tr.querySelector('.contract-remark')?.value || '',
        });
    });
    return rows;
}

// ==========================
// リセット
// ==========================
function resetForm() {
    if (!confirm('入力内容をリセットしますか？')) return;
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea').forEach(el => {
        if (!el.readOnly) el.value = '';
    });
    document.querySelectorAll('.subtotal').forEach(el => el.value = '0');
    document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
    setDefaultDate();
    showToast('リセットしました', 'info');
}

// ==========================
// トースト通知
// ==========================
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
 * チェックボックスの排他制御（ラジオボタンのような動作）
 * @param {HTMLInputElement} el - クリックされたチェックボックス要素
 */
function syncExclusiveCheckbox(el) {
    if (!el.checked) return;
    // 親要素内の他のチェックボックスをすべて解除
    const group = el.closest('.checkbox-group') || el.parentElement;
    const targets = group.querySelectorAll('input[type="checkbox"]');
    targets.forEach(cb => {
        if (cb !== el) cb.checked = false;
    });
}
