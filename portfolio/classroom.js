(() => {
  if (document.querySelector('.lab-toolbar')) return;

  const toolbar = document.createElement('nav');
  toolbar.className = 'lab-toolbar';
  toolbar.setAttribute('aria-label', '課堂展示工具');
  toolbar.innerHTML = `
    <a href="../index.html" title="回到模擬列表"><span aria-hidden="true">⌂</span><span class="lab-label">回到模擬列表</span></a>
    <button type="button" data-lab-fullscreen title="切換全螢幕（F）"><span aria-hidden="true">⛶</span><span class="lab-label">切換全螢幕</span></button>`;

  const hint = document.createElement('div');
  hint.className = 'lab-shortcut';
  hint.textContent = 'F：全螢幕　Esc：離開';
  document.body.append(toolbar, hint);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('此瀏覽器無法切換全螢幕。', error);
    }
  }

  toolbar.querySelector('[data-lab-fullscreen]').addEventListener('click', toggleFullscreen);
  document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if (event.key.toLocaleLowerCase() === 'f' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      event.preventDefault();
      toggleFullscreen();
    }
  });
})();
