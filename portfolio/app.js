const cards = [...document.querySelectorAll('.card')];
const filters = [...document.querySelectorAll('.filter')];
const search = document.querySelector('#search');
const count = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const storageKey = 'portfolio:list-state';
let activeCategory = 'all';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

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

function saveListState(targetHref = '') {
  sessionStorage.setItem(storageKey, JSON.stringify({
    scrollY: window.scrollY,
    activeCategory,
    query: search.value,
    targetHref,
    path: location.pathname
  }));
}

function restoreListState() {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    if (state.path && state.path !== location.pathname) return;

    if (typeof state.query === 'string') search.value = state.query;
    if (typeof state.activeCategory === 'string') {
      const targetFilter = filters.find((button) => button.dataset.filter === state.activeCategory);
      if (targetFilter) {
        activeCategory = state.activeCategory;
        filters.forEach((item) => {
          const selected = item === targetFilter;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-pressed', selected);
        });
      }
    }

    updateCatalog();
    const targetY = Number(state.scrollY) || 0;
    window.scrollTo(0, targetY);
    setTimeout(() => window.scrollTo(0, targetY), 0);
    setTimeout(() => window.scrollTo(0, targetY), 120);
  } catch {
    sessionStorage.removeItem(storageKey);
  }
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

cards.forEach((card) => {
  const link = card.querySelector('a[href]');
  link?.addEventListener('click', () => saveListState(link.getAttribute('href')));
});

window.addEventListener('beforeunload', () => saveListState());
window.addEventListener('pagehide', () => saveListState());
window.addEventListener('pageshow', restoreListState);
restoreListState();
