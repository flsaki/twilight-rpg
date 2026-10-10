// ===== Twilight RPG Manual — Client-side search & navigation =====

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const content = document.getElementById('content');
  const sections = Array.from(document.querySelectorAll('[data-searchable]'));
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  // Build searchable index
  const index = sections.map(section => {
    const titleEl = section.querySelector('h2, h3');
    const title = titleEl ? titleEl.textContent.trim() : section.id;
    const text = section.textContent.replace(/\s+/g, ' ').trim();
    return { section, title, text, id: section.id };
  });

  let activeIndex = -1;
  let currentResults = [];

  // Debounce helper
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Highlight text helper
  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
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

  // Get snippet around match
  function getSnippet(text, query, maxLen = 120) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');

    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + query.length + 60);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  }

  // Perform search
  function doSearch(query) {
    query = query.trim();
    activeIndex = -1;
    currentResults = [];

    // Clear previous highlights in content
    clearContentHighlights();

    if (!query) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      // Show all sections
      sections.forEach(s => s.classList.remove('hidden-by-search'));
      return;
    }

    const qLower = query.toLowerCase();

    // Filter index
    currentResults = index.filter(item => {
      return item.title.toLowerCase().includes(qLower) || item.text.toLowerCase().includes(qLower);
    });

    // Filter visible sections
    const matchedIds = new Set(currentResults.map(r => r.id));
    sections.forEach(s => {
      if (matchedIds.has(s.id)) {
        s.classList.remove('hidden-by-search');
      } else {
        s.classList.add('hidden-by-search');
      }
    });

    // Highlight matches in visible content
    highlightInContent(query);

    // Build dropdown
    if (currentResults.length === 0) {
      searchResults.innerHTML = `<div class="search-no-results">Nenhum resultado para “${escapeHtml(query)}”</div>`;
      searchResults.classList.add('active');
      return;
    }

    searchResults.innerHTML = currentResults.slice(0, 12).map((item, i) => {
      const snippet = getSnippet(item.text, query);
      return `
        <div class="search-result-item" data-index="${i}" data-id="${item.id}">
          <div class="result-title">${highlightText(item.title, query)}</div>
          <div class="result-snippet">${highlightText(snippet, query)}</div>
        </div>
      `;
    }).join('');

    searchResults.classList.add('active');

    // Click handlers
    searchResults.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        goToSection(id);
        searchResults.classList.remove('active');
      });
    });
  }

  function highlightInContent(query) {
    if (!query) return;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');

    sections.forEach(section => {
      if (section.classList.contains('hidden-by-search')) return;

      // Walk text nodes
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
      const nodesToProcess = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement && 
            !['SCRIPT', 'STYLE', 'MARK'].includes(node.parentElement.tagName) &&
            node.textContent.toLowerCase().includes(query.toLowerCase())) {
          nodesToProcess.push(node);
        }
      }

      nodesToProcess.forEach(node => {
        const parent = node.parentNode;
        if (!parent) return;
        const text = node.textContent;
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        const re = new RegExp(regex.source, 'gi');
        while ((match = re.exec(text)) !== null) {
          if (match.index > lastIndex) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          const mark = document.createElement('mark');
          mark.className = 'search-highlight';
          mark.textContent = match[0];
          frag.appendChild(mark);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent.replaceChild(frag, node);
      });
    });
  }

  function clearContentHighlights() {
    document.querySelectorAll('mark.search-highlight').forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }

  function goToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief flash
      el.style.transition = 'box-shadow 0.3s';
      el.style.boxShadow = '0 0 0 3px var(--accent-glow)';
      setTimeout(() => { el.style.boxShadow = ''; }, 1200);
    }
    searchInput.blur();
  }

  // Input handler
  const debouncedSearch = debounce(() => doSearch(searchInput.value), 180);
  searchInput.addEventListener('input', debouncedSearch);

  // Keyboard navigation in results
  searchInput.addEventListener('keydown', (e) => {
    if (!searchResults.classList.contains('active') || currentResults.length === 0) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        doSearch('');
        searchResults.classList.remove('active');
      }
      return;
    }

    const items = searchResults.querySelectorAll('.search-result-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      } else if (currentResults.length > 0) {
        goToSection(currentResults[0].id);
        searchResults.classList.remove('active');
      }
    } else if (e.key === 'Escape') {
      searchResults.classList.remove('active');
      searchInput.blur();
    }
  });

  function updateActiveItem(items) {
    items.forEach((item, i) => {
      item.classList.toggle('active', i === activeIndex);
    });
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('active');
    }
  });

  // Mobile menu
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking a link (mobile)
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Highlight current section in sidebar on scroll
  const navLinks = document.querySelectorAll('.sidebar a[href^="#"]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

  sections.forEach(s => {
    if (s.id) observer.observe(s);
  });
});
