(() => {
  const scene = document.querySelector('.genie-story');
  const motion = scene.querySelector('.genie-motion');
  const papers = [...scene.querySelectorAll('.genie-paper')];
  const pile = scene.querySelector('.genie-pile-front');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const unchecked = ['issue', 'unchecked', 'issue'];
  let generated = 0;
  let timer;

  function emit(paper) {
    paper.dataset.quality = scene.classList.contains('is-guarded') ? 'checked' : unchecked[generated++ % unchecked.length];
  }

  function sync() {
    clearInterval(timer);
    const running = scene.classList.contains('is-visible') && !scene.classList.contains('is-paused') && !reducedMotion.matches;
    scene.getAnimations({subtree: true}).forEach(animation => {
      if (animation.playState === 'finished') return;
      if (!running) animation.pause();
      else if (animation.playState === 'paused') animation.play();
    });
    if (running) timer = setInterval(() => scene.classList.toggle('is-guarded'), 8000);
  }

  function staticResult() {
    scene.classList.add('is-guarded');
    papers.forEach(paper => { paper.dataset.quality = 'checked'; });
    pile.dataset.quality = 'checked';
  }

  scene.classList.toggle('is-guarded', reducedMotion.matches);
  papers.forEach(paper => {
    emit(paper);
    paper.addEventListener('animationiteration', () => {
      pile.dataset.quality = paper.dataset.quality;
      emit(paper);
    });
  });
  pile.dataset.quality = reducedMotion.matches ? 'checked' : 'unchecked';
  if (reducedMotion.matches) staticResult();
  motion.hidden = false;
  motion.addEventListener('click', () => {
    const paused = scene.classList.toggle('is-paused');
    motion.querySelector('span').textContent = paused ? 'Resume animation' : 'Pause animation';
    motion.querySelector('path').setAttribute('d', paused ? 'M8 5v14l11-7Z' : 'M8 5v14M16 5v14');
    sync();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) staticResult();
    sync();
  });
  const observer = new IntersectionObserver(([entry]) => {
    scene.classList.toggle('is-visible', entry.isIntersecting);
    sync();
  }, {threshold: .3});
  observer.observe(scene.querySelector('.genie-scene'));
})();
