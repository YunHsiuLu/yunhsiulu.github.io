const cards = [...document.querySelectorAll('.card')];
const filters = [...document.querySelectorAll('.filter')];
const search = document.querySelector('#search');
const count = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
let activeCategory = 'all';

function normalize(value) {
  return value.trim().toLocaleLowerCase('zh-Hant');
}

function updateCatalog() {
  const query = normalize(search.value);
  let visible = 0;

  cards.forEach((card) => {
    const categories = card.dataset.category.split(' ');
    const matchesCategory = activeCategory === 'all' || categories.includes(activeCategory);
    const matchesQuery = !query || normalize(card.dataset.search).includes(query) || normalize(card.textContent).includes(query);
    const show = matchesCategory && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });

  count.textContent = visible;
  emptyState.hidden = visible !== 0;
}

filters.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    filters.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', selected);
    });
    updateCatalog();
  });
});

search.addEventListener('input', updateCatalog);
