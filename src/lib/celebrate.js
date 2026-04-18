export async function celebrate(userTheme) {
  // Dynamic import to keep initial bundle small
  const confetti = (await import('canvas-confetti')).default;
  const colors = userTheme.id === 'anurag'
    ? ['#1a6fff', '#4da6ff', '#ffffff', '#88ccff']
    : ['#ff4d1a', '#ff8c42', '#ffcc00', '#ffffff'];

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors,
    shapes: ['circle', 'square'],
    scalar: 1.2,
  });

  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
  }, 250);
}
