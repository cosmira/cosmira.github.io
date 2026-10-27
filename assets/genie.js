(() => {
  const scene = document.querySelector('.genie-story');
  const motion = scene.querySelector('.genie-motion');
  const papers = scene.querySelectorAll('.genie-paper');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let started = false;

  if (reducedMotion.matches) papers.forEach(paper => paper.classList.add('is-good'));
  papers.forEach(paper => paper.addEventListener('animationiteration', () => {
    paper.classList.toggle('is-good', scene.classList.contains('is-guarded'));
  }));

  function sync() {
    clearInterval(timer);
    if (scene.classList.contains('is-visible') && !scene.classList.contains('is-paused') && !reducedMotion.matches) {
      timer = setInterval(() => scene.classList.toggle('is-guarded'), 3000);
    }
  }

  motion.hidden = false;
  motion.addEventListener('click', () => {
    const paused = scene.classList.toggle('is-paused');
    motion.querySelector('span').textContent = paused ? 'Resume animation' : 'Pause animation';
    motion.querySelector('path').setAttribute('d', paused ? 'M8 5v14l11-7Z' : 'M8 5v14M16 5v14');
    sync();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      scene.classList.add('is-guarded');
      papers.forEach(paper => paper.classList.add('is-good'));
    }
    sync();
  });
  const observer = new IntersectionObserver(([entry]) => {
    scene.classList.toggle('is-visible', entry.isIntersecting);
    if (entry.isIntersecting && !started && !reducedMotion.matches) {
      scene.classList.remove('is-guarded');
      papers.forEach(paper => paper.classList.remove('is-good'));
      started = true;
    }
    sync();
  }, {threshold: .3});
  observer.observe(scene.querySelector('.genie-scene'));
})();
