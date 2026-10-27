(() => {
  const stack = document.querySelector('.tool-stack');
  const tabs = [...stack.querySelectorAll('[role="tab"]')];
  const panels = stack.querySelectorAll('[role="tabpanel"]');

  function select(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const inactive = panel.id !== tab.getAttribute('aria-controls');
      panel.setAttribute('aria-hidden', String(inactive));
      panel.inert = inactive;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
      select(next);
      next.focus({preventScroll: true});
    });
  });

  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true'));
  stack.classList.add('stack-enhanced');
})();
