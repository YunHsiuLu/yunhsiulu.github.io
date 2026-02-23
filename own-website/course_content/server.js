const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080; // 你也可以改成 3000 或其他

// 1. 設定 Middleware：解析 JSON 請求
app.use(bodyParser.json());

// 2. 設定靜態檔案路徑 (這行的功能就等於 http-server)
app.use(express.static(__dirname));

// 3. 處理「存檔」請求 (POST /save)
app.post('/save', (req, res) => {
    const { classId, date, period, content } = req.body;

    if (!classId || !date || !period) {
        return res.status(400).json({ error: '缺少必要參數' });
    }

    const filePath = path.join(__dirname, 'data', `${classId}.json`);

    // 讀取檔案
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(404).json({ error: '找不到該班級檔案' });
        }

        try {
            const jsonData = JSON.parse(data);
            let updated = false;

            // 搜尋並更新對應的課程
            for (let item of jsonData.schedule) {
                if (item.date === date && item.period === period) {
                    item.content = content; // 更新內容
                    updated = true;
                    break;
                }
            }

            if (!updated) {
                console.log(`警告: 找不到 ${classId} 班 ${date} ${period} 的課程`);
                // 這裡可以選擇報錯，或是不做動作回傳成功
            }

            // 寫回檔案
            fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error('寫入錯誤:', err);
                    return res.status(500).json({ error: '寫入檔案失敗' });
                }
                
                console.log(`已更新: ${classId}班 - ${date} (${content})`);
                res.json({ status: 'success' });
            });

        } catch (parseErr) {
            console.error('JSON 解析錯誤:', parseErr);
            res.status(500).json({ error: 'JSON 格式錯誤' });
        }
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器已啟動: http://localhost:${PORT}`);
    console.log('請在瀏覽器開啟上方網址，按 Ctrl+C 可停止伺服器');
});
