# Character repaint v2

These lossless transparent masters replace the first-pass pose renders at build time without
overwriting them. The art bible remains `assets/kienaide-v3/snow-town.webp` and
`assets/kienaide-v3/traveller-flame.webp`.

## Generation direction

Each pose was edited separately with the original pose as image 1, `snow-town.webp` as the painting
language reference, and `traveller-flame.webp` as the identity reference. The shared prompt required:

- the exact pose, silhouette, costume, crop, and emotional beat from image 1;
- broad indigo/navy gouache masses, softened edges, visible dry-brush pigment, and economical folds;
- a few irregular snow clumps instead of repeated snowflakes, speckles, or lace-like frost;
- a small, understated face without glossy skin, oversized sparkling eyes, plastic hair, neon rim
  light, or a crunchy cutout halo;
- a centered full figure on a true transparent 3:4 canvas, with no background, floor, text, flame,
  particles, shadow, or extra objects.

Pose-specific prompt lines preserved closed eyes, bracing wind, breathlessness, cold, upward gaze,
relief, kneeling loss, suffocation, survival, dawn, or hope as appropriate. `end-dawn` and the two
hopeful endings permit only a faint natural rose-gold edge from dawn, never a magical glow.
