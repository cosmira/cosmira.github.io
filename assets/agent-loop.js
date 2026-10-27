(() => {
  const loop = document.querySelector('.agent-loop');
  const tabs = [...loop.querySelectorAll('[role="tab"]')];
  const routes = [...loop.querySelectorAll('.loop-route')];
  const panels = [...loop.querySelectorAll('[role="tabpanel"]')];
  const next = loop.querySelector('.loop-next');
  const progress = loop.querySelector('.loop-progress');
  const actions = ['Run Soda', 'Apply fixes', 'Recheck', 'Replay'];
  const stages = ['Agent draft', 'Two Soda findings', 'Agent revision', 'Both findings resolved'];
  let current = 0;

  function select(index) {
    current = index;
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('loop-step-complete', position < index);
      routes[position].classList.toggle('is-active', selected);
      panels[position].setAttribute('aria-hidden', String(!selected));
      panels[position].inert = !selected;
    });
    next.firstChild.textContent = `${actions[index]} `;
    progress.textContent = stages[index];
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      select(target);
      tabs[target].focus({preventScroll: true});
    });
  });
  next.addEventListener('click', () => select((current + 1) % tabs.length));
  loop.querySelector('.loop-steps').hidden = false;
  loop.querySelector('.loop-controls').hidden = false;
  loop.classList.add('loop-enhanced');
})();
