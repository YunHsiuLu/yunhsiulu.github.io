// --- 設定 ---
const classes = ['401', '403', '404', '406', '407', '409', '410'];
const semesterStart = new Date(2026, 1, 9);
const specificHolidays = ['02/27', '04/03', '04/06', '05/01', '06/19'];
const examDates = ['03/30', '03/31', '05/13', '05/14', '06/26', '06/29'];
const exam1Start = new Date(2026, 2, 30);
const exam1End   = new Date(2026, 2, 31);
const exam2Start = new Date(2026, 4, 13);
const exam2End   = new Date(2026, 4, 14);
const exam3Start = new Date(2026, 5, 26);

// ★★★ 修改處：新增 quiz 類別，將「小考」獨立出來 ★★★
const keywords = {
    holiday: ['放假', '停課', '調課', '連假', '春假', '國定假日', '校慶補假'],
    exam: ['段考'],
    quiz: ['小考'],
    exercise: ['練習']
};

// --- 全局變數 ---
let isEditMode = false;

// --- 功能：切換編輯模式 ---
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const btn = document.getElementById('modeToggle');
    const body = document.body;

    if (isEditMode) {
        btn.innerHTML = '🖊️';
        btn.classList.add('active');
        body.classList.add('edit-mode-active');
    } else {
        btn.innerHTML = '👀';
        btn.classList.remove('active');
        body.classList.remove('edit-mode-active');
    }

    const allContentCells = document.querySelectorAll('.content-text');
    allContentCells.forEach(cell => {
        cell.contentEditable = isEditMode;
    });
}

// --- 存檔功能 ---
async function saveContent(element, classId, date, period) {
    if (!isEditMode) return;

    const newContent = element.innerText.trim();
    const statusBox = document.getElementById('saveStatus');
    
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                classId: classId,
                date: date,
                period: period,
                content: newContent
            })
        });

        if (response.ok) {
            statusBox.innerText = `✅ 已儲存 (${classId})`;
            statusBox.style.backgroundColor = "#2ecc71";
            statusBox.style.opacity = 1;
            setTimeout(() => { statusBox.style.opacity = 0; }, 2500);
            
            // 簡單觸發重新渲染 (為了讓顏色即時更新，建議直接 reload 或優化 DOM 操作)
            // 這裡為了保持簡單，我們只更新當下格子的顏色(若有需要)
            // 但因為涉及到 CSS class 的變化，最簡單的方式是重新呼叫 switchView()
            // switchView(); // 若覺得閃爍可以註解掉
        } else {
            throw new Error();
        }
    } catch (error) {
        console.error(error);
        statusBox.innerText = "❌ 儲存失敗";
        statusBox.style.backgroundColor = "#e74c3c";
        statusBox.style.opacity = 1;
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
}

// --- 輔助函式 ---
function parseDate(dateStr) {
    const [mm, dd] = dateStr.split('/');
    return new Date(2026, parseInt(mm)-1, parseInt(dd));
}

// ★★★ 修改處：新增 quiz 的判斷邏輯 ★★★
function getContentType(text, dateStr) {
    if (!text) return '';
    if (specificHolidays.includes(dateStr)) return 'holiday';
    if (examDates.includes(dateStr)) return 'exam';
    
    if (keywords.holiday.some(k => text.includes(k))) return 'holiday';
    if (keywords.exam.some(k => text.includes(k))) return 'exam';
    if (keywords.quiz.some(k => text.includes(k))) return 'quiz'; // 新增這行
    if (keywords.exercise.some(k => text.includes(k))) return 'exercise';

    return 'normal';
}

function calculateStats(schedule) {
    let stats = {
        period1: { remaining: 0, total: 0 },
        period2: { remaining: 0, total: 0 },
        period3: { remaining: 0, total: 0 }
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    schedule.forEach(item => {
        const dateObj = parseDate(item.date);
        const type = getContentType(item.content, item.date);
        
        // 小考通常算上課次數，所以這裡只排除 holiday 和 exam
        if (type === 'holiday' || type === 'exam') return;

        const isFuture = dateObj >= today;
        if (dateObj < exam1Start) {
            stats.period1.total++;
            if (isFuture) stats.period1.remaining++;
        } else if (dateObj > exam1End && dateObj < exam2Start) {
            stats.period2.total++;
            if (isFuture) stats.period2.remaining++;
        } else if (dateObj > exam2End && dateObj < exam3Start) {
            stats.period3.total++;
            if (isFuture) stats.period3.remaining++;
        }
    });
    return stats;
}

// --- 渲染 ---
async function switchView() {
    const selector = document.getElementById('classSelector');
    const displayArea = document.getElementById('displayArea');
    const selectedValue = selector.value;
    displayArea.innerHTML = '<p style="text-align:center;">資料讀取中...</p>';

    if (selectedValue === 'all') await renderMatrixView();
    else await renderSingleClassView(selectedValue);
}

async function renderMatrixView() {
    const displayArea = document.getElementById('displayArea');
    const allData = {};
    const classStats = {};
    let maxWeek = 0;

    try {
        const promises = classes.map(id => fetch(`data/${id}.json?t=${Date.now()}`).then(r => r.json()));
        const results = await Promise.all(promises);

        results.forEach((data, index) => {
            const classId = classes[index];
            classStats[classId] = calculateStats(data.schedule);
            data.schedule.forEach(item => {
                const dateObj = parseDate(item.date);
                const weekNum = Math.floor((Math.ceil((dateObj - semesterStart) / 86400000)) / 7) + 1;
                if (weekNum > 0) {
                    if (!allData[weekNum]) allData[weekNum] = {};
                    if (!allData[weekNum][classId]) allData[weekNum][classId] = [];
                    allData[weekNum][classId].push(item);
                    if (weekNum > maxWeek) maxWeek = weekNum;
                }
            });
        });

        let tableHtml = `<div class="matrix-container"><table class="matrix-table">`;
        tableHtml += `<thead><tr><th style="width:60px;">週次</th>${classes.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
        
        tableHtml += `<tr class="matrix-stat-row"><th>剩餘<br><span style="font-weight:normal;font-size:0.8em">(總數)</span></th>`;
        classes.forEach(cls => {
            const s = classStats[cls];
            tableHtml += `<td>1段前: <b>${s.period1.remaining}</b> (${s.period1.total})<br>1-2段: <b>${s.period2.remaining}</b> (${s.period2.total})<br>2-3段: <b>${s.period3.remaining}</b> (${s.period3.total})</td>`;
        });
        tableHtml += `</tr><tbody>`;

        const weeks = Object.keys(allData).map(Number).sort((a,b)=>a-b);
        const startWeek = weeks.length > 0 ? weeks[0] : 1; 

        for (let w = startWeek; w <= maxWeek; w++) {
            const weekDate = new Date(semesterStart);
            weekDate.setDate(semesterStart.getDate() + (w - 1) * 7);
            const dateStr = `${weekDate.getMonth()+1}/${weekDate.getDate()}`;
            tableHtml += `<tr><th>第 ${w} 週<br><span style="font-size:12px;color:#7f8c8d;font-weight:normal;">${dateStr}起</span></th>`;
            
            classes.forEach(cls => {
                const cellData = allData[w]?.[cls];
                let cellContent = '';
                if (cellData) {
                    cellData.forEach(c => {
                        const type = getContentType(c.content, c.date);
                        
                        // ★★★ 修改處：加入 quiz 的 class 判斷 ★★★
                        let extraClass = '';
                        if (type === 'holiday') extraClass = 'type-holiday';
                        else if (type === 'exam') extraClass = 'type-exam';
                        else if (type === 'quiz') extraClass = 'type-quiz'; // 新增
                        else if (type === 'exercise') extraClass = 'type-exercise';
                        
                        const editableAttr = isEditMode ? 'contenteditable="true"' : 'contenteditable="false"';

                        cellContent += `
                            <div class="content-cell ${extraClass}">
                                <span>(${c.weekday})</span>
                                <div class="content-text" 
                                     ${editableAttr}
                                     onkeydown="handleEnter(event)"
                                     onblur="saveContent(this, '${cls}', '${c.date}', '${c.period}')"
                                >${c.content}</div>
                            </div>`;
                    });
                }
                tableHtml += `<td>${cellContent}</td>`;
            });
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table></div>`;
        displayArea.innerHTML = tableHtml;
    } catch (e) { console.error(e); }
}

async function renderSingleClassView(classId) {
    const displayArea = document.getElementById('displayArea');
    try {
        const response = await fetch(`data/${classId}.json?t=${Date.now()}`);
        const data = await response.json();
        const stats = calculateStats(data.schedule);

        const statsHtml = `
            <div class="stats-bar">
                <div class="stat-item"><span class="stat-label">1段前</span><span class="stat-value">${stats.period1.remaining} <span>/ ${stats.period1.total}</span></span></div>
                <div class="stat-item"><span class="stat-label">1~2段</span><span class="stat-value">${stats.period2.remaining} <span>/ ${stats.period2.total}</span></span></div>
                <div class="stat-item"><span class="stat-label">2~3段</span><span class="stat-value">${stats.period3.remaining} <span>/ ${stats.period3.total}</span></span></div>
            </div>`;

        let rows = '';
        const today = new Date(); today.setHours(0,0,0,0);

        data.schedule.forEach(item => {
            const dateObj = parseDate(item.date);
            const weekNum = Math.floor((Math.ceil((dateObj - semesterStart) / 86400000)) / 7) + 1;
            const type = getContentType(item.content, item.date);
            
            // ★★★ 修改處：加入 quiz 的 class 判斷 ★★★
            let rowClass = '';
            if (type === 'holiday') rowClass = 'row-holiday';
            else if (type === 'exam') rowClass = 'row-exam';
            else if (type === 'quiz') rowClass = 'row-quiz'; // 新增
            else if (type === 'exercise') rowClass = 'row-exercise';

            if (dateObj < today && type === 'normal') rowClass += ' past-class';

            const editableAttr = isEditMode ? 'contenteditable="true"' : 'contenteditable="false"';

            rows += `
                <tr class="${rowClass}">
                    <td>第 ${weekNum} 週</td>
                    <td>${item.date} (${item.weekday})</td>
                    <td>${item.period}</td>
                    <td>
                        <div class="content-text"
                             ${editableAttr}
                             onkeydown="handleEnter(event)"
                             onblur="saveContent(this, '${classId}', '${item.date}', '${item.period}')"
                        >${item.content}</div>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="class-card">
                <div class="card-header"><span class="class-name">${data.className}</span><span class="class-note">${data.note}</span></div>
                <div style="padding: 20px 20px 0 20px;">${statsHtml}</div>
                <div style="padding: 20px;">
                    <table class="single-table">
                        <thead><tr><th style="width:12%">週次</th><th style="width:18%">日期</th><th style="width:20%">時間</th><th>課程內容</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
        displayArea.innerHTML = html;
    } catch (e) { console.error(e); }
}
