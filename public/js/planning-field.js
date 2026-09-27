(() => {
  const canvas = document.querySelector('.planning-field');
  const host = canvas?.closest('.care-map');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!host || !context) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const resting = { x: .76, y: .44, focus: 0 };
  const current = { ...resting };
  const target = { ...resting };
  let width = 0;
  let height = 0;
  let frame = 0;

  function resize() {
    const bounds = host.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    if (!width || !height) return;

    const cursorX = current.x * width;
    const cursorY = current.y * height;
    const centerX = width * .82 + (current.x - resting.x) * 18;
    const centerY = height * .42 + (current.y - resting.y) * 18;

    for (let y = 19; y < height; y += 25) {
      for (let x = 19; x < width; x += 25) {
        const distance = Math.hypot(x - cursorX, y - cursorY);
        const response = current.focus * Math.max(0, 1 - distance / 135);
        context.fillStyle = `rgba(148, 190, 242, ${.09 + response * .25})`;
        context.beginPath();
        context.arc(x, y, 1 + response * .7, 0, Math.PI * 2);
        context.fill();
      }
    }

    for (const [index, radius] of [86, 144, 204].entries()) {
      context.beginPath();
      context.ellipse(centerX, centerY, radius, radius * .78, -.12, 0, Math.PI * 2);
      context.strokeStyle = `rgba(153, 194, 245, ${.12 + index * .025 + current.focus * .055})`;
      context.lineWidth = 1;
      context.stroke();
    }

    if (current.focus > .025) {
      context.strokeStyle = `rgba(172, 205, 250, ${current.focus * .45})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cursorX - 10, cursorY);
      context.lineTo(cursorX - 4, cursorY);
      context.moveTo(cursorX + 4, cursorY);
      context.lineTo(cursorX + 10, cursorY);
      context.moveTo(cursorX, cursorY - 10);
      context.lineTo(cursorX, cursorY - 4);
      context.moveTo(cursorX, cursorY + 4);
      context.lineTo(cursorX, cursorY + 10);
      context.stroke();
      context.beginPath();
      context.arc(cursorX, cursorY, 1.6, 0, Math.PI * 2);
      context.fillStyle = `rgba(196, 221, 255, ${current.focus * .7})`;
      context.fill();
    }
  }

  function animate() {
    frame = 0;
    for (const key of ['x', 'y', 'focus']) current[key] += (target[key] - current[key]) * .18;
    draw();
    const unsettled = ['x', 'y', 'focus'].some(key => Math.abs(target[key] - current[key]) > .004);
    if (unsettled) frame = requestAnimationFrame(animate);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(animate);
  }

  host.addEventListener('pointermove', event => {
    if (motion.matches || !finePointer.matches) return;
    const bounds = host.getBoundingClientRect();
    target.x = Math.max(.05, Math.min(.95, (event.clientX - bounds.left) / bounds.width));
    target.y = Math.max(.05, Math.min(.95, (event.clientY - bounds.top) / bounds.height));
    target.focus = 1;
    schedule();
  }, { passive: true });
  host.addEventListener('pointerleave', () => {
    Object.assign(target, resting);
    schedule();
  });
  motion.addEventListener('change', event => {
    if (event.matches) {
      Object.assign(target, resting);
      Object.assign(current, resting);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw();
    }
  });

  new ResizeObserver(resize).observe(host);
})();
