// ===== Arquivo do Twilight — search & nav =====
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const sections = Array.from(document.querySelectorAll('[data-searchable]'));
  const pills = Array.from(document.querySelectorAll('.pill'));
  const progressBar = document.getElementById('readingProgress');

  // Search index
  const index = sections.map((section) => {
    const titleEl = section.querySelector('h1, h2, h3');
    const title = titleEl ? titleEl.textContent.trim() : section.id;
    const text = section.textContent.replace(/\s+/g, ' ').trim();
    return { section, title, text, id: section.id };
  });

  let activeIndex = -1;
  let currentResults = [];

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  function getSnippet(text, query, maxLen = 110) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
    const start = Math.max(0, idx - 35);
    const end = Math.min(text.length, idx + query.length + 55);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  }

  function clearContentHighlights() {
    document.querySelectorAll('mark.search-highlight').forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }

  function highlightInContent(query) {
    if (!query) return;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    sections.forEach((section) => {
      if (section.classList.contains('hidden-by-search')) return;
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          node.parentElement &&
          !['SCRIPT', 'STYLE', 'MARK'].includes(node.parentElement.tagName) &&
          node.textContent.toLowerCase().includes(query.toLowerCase())
        ) {
          nodes.push(node);
        }
      }
      nodes.forEach((node) => {
        const parent = node.parentNode;
        if (!parent) return;
        const text = node.textContent;
        const frag = document.createDocumentFragment();
        let last = 0;
        let match;
        const re = new RegExp(regex.source, 'gi');
        while ((match = re.exec(text)) !== null) {
          if (match.index > last) {
            frag.appendChild(document.createTextNode(text.slice(last, match.index)));
          }
          const mark = document.createElement('mark');
          mark.className = 'search-highlight';
          mark.textContent = match[0];
          frag.appendChild(mark);
          last = match.index + match[0].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        parent.replaceChild(frag, node);
      });
    });
  }

  function doSearch(query) {
    query = query.trim();
    activeIndex = -1;
    currentResults = [];
    clearContentHighlights();

    if (!query) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      sections.forEach((s) => s.classList.remove('hidden-by-search'));
      return;
    }

    const qLower = query.toLowerCase();
    currentResults = index.filter(
      (item) => item.title.toLowerCase().includes(qLower) || item.text.toLowerCase().includes(qLower)
    );

    const matchedIds = new Set(currentResults.map((r) => r.id));
    // Also keep parent pages visible if a child matches
    sections.forEach((s) => {
      if (matchedIds.has(s.id)) {
        s.classList.remove('hidden-by-search');
      } else {
        s.classList.add('hidden-by-search');
      }
    });

    highlightInContent(query);

    if (currentResults.length === 0) {
      searchResults.innerHTML = `<div class="search-no-results">Nenhum resultado para “${escapeHtml(query)}”</div>`;
      searchResults.hidden = false;
      return;
    }

    searchResults.innerHTML = currentResults
      .slice(0, 12)
      .map((item, i) => {
        const snippet = getSnippet(item.text, query);
        return `
        <div class="search-result-item" data-index="${i}" data-id="${item.id}">
          <div class="result-title">${highlightText(item.title, query)}</div>
          <div class="result-snippet">${highlightText(snippet, query)}</div>
        </div>`;
      })
      .join('');
    searchResults.hidden = false;

    searchResults.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', () => {
        goToSection(el.dataset.id);
        searchResults.hidden = true;
      });
    });
  }

  function goToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    searchInput.blur();
  }

  const debouncedSearch = debounce(() => doSearch(searchInput.value), 160);
  searchInput.addEventListener('input', debouncedSearch);

  searchInput.addEventListener('keydown', (e) => {
    if (searchResults.hidden || currentResults.length === 0) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        doSearch('');
      }
      return;
    }
    const items = searchResults.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].click();
      else if (currentResults[0]) {
        goToSection(currentResults[0].id);
        searchResults.hidden = true;
      }
    } else if (e.key === 'Escape') {
      searchResults.hidden = true;
      searchInput.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.hidden = true;
    }
  });

  // Reading progress
  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Active pill on scroll
  const pageSections = ['inicio', 'universo', 'mecanicas', 'depravacoes', 'ficha'];
  const pageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          pills.forEach((p) => {
            p.classList.toggle('active', p.dataset.section === id);
          });
        }
      });
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: 0 }
  );
  pageSections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) pageObserver.observe(el);
  });
});
