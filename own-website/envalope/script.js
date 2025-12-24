document.addEventListener('DOMContentLoaded', () => {
    const envelopeWrapper = document.getElementById('envelope');
    const letter = document.getElementById('letter');
    let isOpened = false;

    envelopeWrapper.addEventListener('click', () => {
        if (isOpened) return;
        isOpened = true;

        // 1. 打開信封
        envelopeWrapper.classList.add('open');

        // 2. 抽出信紙 (抽出時，CSS 會顯示 letter-cover: test2.png)
        setTimeout(() => {
            letter.classList.add('extracted');
        }, 600);

        // 3. 全螢幕展開
        setTimeout(() => {
            
            // --- 步驟 A: 鎖定位置 ---
            const rect = letter.getBoundingClientRect();
            letter.style.transition = 'none';

            // 固定位置
            letter.style.position = 'fixed';
            letter.style.top = `${rect.top}px`;
            letter.style.left = `${rect.left}px`;
            letter.style.width = `${rect.width}px`;
            letter.style.height = `${rect.height}px`;
            letter.style.transform = 'none'; 
            
            // 移到最上層並掛載到 body
            letter.style.zIndex = '999';
            letter.style.margin = '0';
            document.body.appendChild(letter);

            // --- 步驟 B: 重繪 ---
            void letter.offsetWidth;

            // --- 步驟 C: 執行放大 ---
            letter.style.transition = 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
            
            requestAnimationFrame(() => {
                letter.style.top = '50%';
                letter.style.left = '50%';
                letter.style.width = '80vw';     
                letter.style.maxWidth = '800px'; 
                letter.style.height = '85vh';
                letter.style.transform = 'translate(-50%, -50%)';
                letter.style.borderRadius = '10px';
                
                // [關鍵] 加入 full-mode Class
                // CSS 會自動處理：cover (test2) 淡出 -> content (test1) 淡入
                letter.classList.add('full-mode');
            });

            // --- 步驟 D: 信封退場 ---
            envelopeWrapper.classList.add('move-down');
            document.body.style.overflow = 'auto';

        }, 1800); 
    });
});
