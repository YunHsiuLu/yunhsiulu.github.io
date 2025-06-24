// label_position.js
document.addEventListener('DOMContentLoaded', function () {
  const img = document.getElementById('mrt-map');
  if (!img) return;

  img.addEventListener('click', function(event) {
    const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log('點擊座標：', x, y);
  });
});

