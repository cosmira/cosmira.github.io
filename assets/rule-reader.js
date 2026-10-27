(() => {
  const rawRoot = 'https://raw.githubusercontent.com/cosmira/soda/master/docs/rules/';
  const githubRoot = 'https://github.com/cosmira/soda/blob/master/docs/rules/';
  const element = id => document.getElementById(id);
  const cache = new Map();
  const panel = element('rule-panel');
  const welcome = element('catalog-welcome');
  const list = element('rules');
  const catalogTitle = document.title;
  let returnLink;
  let activeRequest;
  let renderedId;
  let ruleIndex = {};
  let mobileListScroll = 0;

  function announce(message) {
    element('announcement').textContent = message;
  }

  function state(title, message, {loading = false, retry = false} = {}) {
    element('content').hidden = true;
    element('summary').hidden = true;
    element('state').hidden = false;
    element('state-title').textContent = title;
    element('state-message').textContent = message;
    element('loading').hidden = !loading;
    element('retry').hidden = !retry;
    element('document').setAttribute('aria-busy', String(loading));
    announce(title);
  }

  function route() {
    try {
      const parts = decodeURIComponent(location.hash.slice(1)).split('/');
      if (!parts[0]) return null;
      if (parts.length > 2 || !/^[a-z][a-z0-9_]*$/.test(parts[0]) || !/^[a-z0-9_-]*$/.test(parts[1] || '')) throw new Error('Invalid route');
      return {id: parts[0], section: parts[1] || ''};
    } catch {
      return {invalid: true};
    }
  }

  function scrollToSection(section) {
    const heading = [...element('content').querySelectorAll('[id]')].find(node => node.id === section);
    window.scrollTo({top: heading ? window.scrollY + heading.getBoundingClientRect().top - element('close-rule').closest('.panel-toolbar').offsetHeight - 24 : 0, behavior: 'instant'});
  }

  function openPanel(id) {
    if (!document.body.classList.contains('is-reading')) mobileListScroll = window.scrollY;
    document.body.classList.add('is-reading');
    panel.hidden = false;
    welcome.hidden = true;
    element('close-rule').hidden = false;
    element('source').hidden = false;
    if (matchMedia('(max-width: 760px)').matches && document.activeElement.matches('.rule a')) element('close-rule').focus({preventScroll: true});
    document.querySelectorAll('.rule a').forEach(link => {
      if (link.hash === '#' + id) {
        link.setAttribute('aria-current', 'true');
        returnLink = link;
        const row = link.closest('.rule');
        const top = list.scrollTop + row.getBoundingClientRect().top - list.getBoundingClientRect().top;
        if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = Math.max(0, top - 12);
        }
      } else link.removeAttribute('aria-current');
    });
  }

  function closePanel() {
    const wasReading = document.body.classList.contains('is-reading');
    document.body.classList.remove('is-reading');
    panel.hidden = true;
    welcome.hidden = false;
    document.querySelectorAll('.rule a[aria-current]').forEach(link => link.removeAttribute('aria-current'));
    document.title = catalogTitle;
    if (wasReading) window.scrollTo({top: matchMedia('(max-width: 760px)').matches ? mobileListScroll : 0, behavior: 'instant'});
    if (wasReading) {
      const target = returnLink && !returnLink.closest('.rule').hidden ? returnLink : element('search');
      target.focus({preventScroll: true});
      announce('Rule closed. Choose another rule from the list.');
    }
  }

  function closeRule() {
    history.pushState(null, '', location.pathname + location.search);
    navigate();
  }

  function copyButton(code) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code example');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = 'Copied';
        announce('Code copied.');
        setTimeout(() => { button.textContent = 'Copy'; }, 2000);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        announce('Code selected. Press Command C or Control C to copy.');
      }
    });
    return button;
  }

  function render(markdown, id) {
    const fragment = DOMPurify.sanitize(marked.parse(markdown.replace(/^[\u200B-\u200F\uFEFF]+/, ''), {gfm: true, async: false}), {
      RETURN_DOM_FRAGMENT: true,
      ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','ul','ol','li','a','strong','em','del','s','blockquote','pre','code','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','title','start','align','class','colspan','rowspan'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false
    });
    const content = element('content');
    const markdownTitle = fragment.querySelector('h1');
    if (!ruleIndex[id] && markdownTitle) element('rule-title').textContent = markdownTitle.textContent.replaceAll('_', ' ');
    markdownTitle?.remove();
    content.replaceChildren(fragment);

    const first = content.firstElementChild;
    if (first?.tagName === 'P') {
      if (first.firstChild?.nodeType === Node.TEXT_NODE) first.firstChild.textContent = first.firstChild.textContent.replace(/^[\s📝]+/u, '');
      element('summary').replaceChildren(...first.childNodes);
      element('summary').hidden = false;
      first.remove();
    }
    const policy = content.firstElementChild;
    if (policy?.tagName === 'P' && /^[💼🚫✅]/u.test(policy.textContent.trim())) policy.classList.add('policy');

    const slugs = new Set();
    content.querySelectorAll('h2,h3,h4,h5,h6').forEach(heading => {
      const base = heading.textContent.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/\s+/g, '-') || 'section';
      let slug = base;
      for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
      slugs.add(slug);
      heading.id = slug;
    });

    document.querySelectorAll('#content a[href], #summary a[href]').forEach(link => {
      try {
        const destination = new URL(link.getAttribute('href'), githubRoot + id + '.md');
        if (!['https:', 'http:'].includes(destination.protocol)) {
          link.removeAttribute('href');
          return;
        }
        const localRule = destination.origin === 'https://github.com' && destination.pathname.match(/^\/cosmira\/soda\/blob\/master\/docs\/rules\/([a-z][a-z0-9_]*)\.md$/);
        if (localRule) {
          const section = destination.hash.slice(1).replace(/[^a-z0-9_-]/g, '');
          link.href = `#${localRule[1]}${section ? '/' + section : ''}`;
        } else if (destination.origin === 'https://github.com' && destination.pathname === '/cosmira/soda/blob/master/docs/rules/README.md') {
          link.href = 'rules.html';
        } else {
          link.href = destination.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      } catch {
        link.removeAttribute('href');
      }
    });

    content.querySelectorAll('pre').forEach(pre => {
      const code = pre.querySelector('code');
      if (!code) return;
      const frame = document.createElement('div');
      frame.className = 'code-frame';
      const toolbar = document.createElement('div');
      toolbar.className = 'code-toolbar';
      const label = document.createElement('span');
      label.textContent = (code.className.match(/language-([a-z0-9_-]+)/i)?.[1] || 'Code').toUpperCase();
      toolbar.append(label, copyButton(code));
      pre.before(frame);
      frame.append(toolbar, pre);
    });
    content.querySelectorAll('table').forEach(table => {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', 'Rule parameters');
      wrap.tabIndex = 0;
      table.before(wrap);
      wrap.append(table);
    });
    content.querySelectorAll('[class]').forEach(node => {
      if (node.tagName === 'CODE') return;
      const allowed = ['policy','code-frame','code-toolbar','copy','table-wrap'];
      [...node.classList].forEach(name => { if (!allowed.includes(name)) node.classList.remove(name); });
    });
    if (window.hljs) content.querySelectorAll('pre code').forEach(code => {
      const language = code.className.match(/language-([a-z0-9_-]+)/i)?.[1].toLowerCase();
      if (!language || !hljs.getLanguage(language)) return;
      code.innerHTML = DOMPurify.sanitize(hljs.highlight(code.textContent, {language, ignoreIllegals: true}).value, {
        ALLOWED_TAGS: ['span'],
        ALLOWED_ATTR: ['class']
      });
      code.classList.add('hljs');
    });
    element('state').hidden = true;
    content.hidden = false;
    element('document').setAttribute('aria-busy', 'false');
    renderedId = id;
    announce('Rule documentation loaded.');
  }

  async function navigate() {
    const next = route();
    if (next && !next.invalid && next.id === renderedId && !element('content').hidden) {
      scrollToSection(next.section);
      return;
    }
    activeRequest?.abort();
    activeRequest = undefined;
    if (!next) {
      renderedId = undefined;
      closePanel();
      return;
    }
    const controller = new AbortController();
    activeRequest = controller;
    renderedId = undefined;
    openPanel(next.id);
    window.scrollTo({top: 0, behavior: 'instant'});
    if (next.invalid) {
      element('rule-title').textContent = 'That link doesn’t look right.';
      element('rule-id').hidden = true;
      element('share').hidden = true;
      element('rule-category').textContent = 'Rule details';
      element('source').href = 'https://github.com/cosmira/soda/tree/master/docs/rules';
      document.title = 'Soda — Rule documentation';
      state('Invalid rule address.', 'Choose a rule from the list to read its examples and configuration.');
      return;
    }
    const {id, section} = next;
    const metadata = ruleIndex[id];
    const title = metadata?.title || id.replaceAll('_', ' ');
    element('rule-title').textContent = title;
    element('rule-id').textContent = id;
    element('rule-id').hidden = false;
    element('share').hidden = false;
    element('rule-category').textContent = metadata?.category || 'Rule details';
    element('source').href = githubRoot + id + '.md';
    document.title = `${title} — Soda`;
    state('Loading the rule…', 'Getting the current documentation from GitHub.', {loading: true});
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    try {
      if (!window.marked || !window.DOMPurify) throw new Error('reader');
      let markdown = cache.get(id);
      if (markdown === undefined) {
        const response = await fetch(rawRoot + id + '.md', {signal: controller.signal, credentials: 'omit'});
        if (!response.ok) throw new Error(response.status === 404 ? 'not-found' : 'http');
        markdown = await response.text();
        if (!markdown.trim() || !/^#\s/m.test(markdown)) throw new Error('format');
        cache.set(id, markdown);
      }
      if (activeRequest !== controller) return;
      render(markdown, id);
      scrollToSection(section);
    } catch (error) {
      if (activeRequest !== controller) return;
      const missing = error.message === 'not-found';
      const unavailable = error.message === 'reader';
      state(missing ? 'Documentation not found.' : unavailable ? 'The reader couldn’t load.' : 'Couldn’t load this rule.',
        missing ? 'The Markdown file isn’t available at this GitHub address. You can browse other checks or open the source on GitHub.' :
        unavailable ? 'Reload this page to load the reader files, or open the documentation on GitHub.' :
        'The connection to GitHub may be unavailable or took too long. Try again, or open the source on GitHub.', {retry: true});
    } finally {
      clearTimeout(timeout);
    }
  }

  element('retry').addEventListener('click', navigate);
  element('find-rule').addEventListener('click', () => element('search').focus({preventScroll: true}));
  list.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const links = [...list.querySelectorAll('.rule:not([hidden]) a')];
    const index = links.indexOf(event.target.closest('a'));
    if (index < 0) return;
    event.preventDefault();
    const next = links[Math.max(0, Math.min(links.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))];
    next.focus({preventScroll: true});
    next.click();
  });
  element('close-rule').addEventListener('click', closeRule);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('is-reading') && !event.target.matches('input, select')) {
      event.preventDefault();
      closeRule();
    }
  });
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    const reading = document.body.classList.contains('is-reading');
    const target = reading ? panel : element('search');
    target.tabIndex = -1;
    target.focus({preventScroll: true});
    if (reading) window.scrollTo({top: 0, behavior: 'instant'});
  });
  element('share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      element('share').textContent = 'Link copied';
      announce('Rule link copied.');
      setTimeout(() => { element('share').textContent = 'Copy link'; }, 2000);
    } catch {
      announce('Copy this rule’s address from the browser address bar.');
    }
  });
  window.addEventListener('hashchange', navigate);
  const data = document.getElementById('rule-index');
  if (data) ruleIndex = JSON.parse(data.textContent);
  navigate();
})();
