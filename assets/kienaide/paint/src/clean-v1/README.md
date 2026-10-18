# Kienaide — noise cleanup v1

Built-in image generation edits, 2026-10-19. Inputs: matching `../repaint-v2/hero-walk.png` and `hero-shield.png`. Originals retained. Selected PNGs are project masters; `scripts/art/kienaide-paint.mjs` makes runtime WebP. Only these two high-exposure poses change, not the art bible or remaining character states.

## Prompts

hero-walk:

> Use case: identity-preserve. Edit target: supplied transparent full-body game sprite. Create a cleanup-only version for the same game: reduce harsh tiny jagged pixel speckling and crunchy high-frequency texture on scarf, coat snow and silhouette; keep broad subtle gouache brushwork and painted snow, no plastic smoothness. Preserve EXACT face, expression, pose, silhouette, clothing, colors, hand placement, feet position, framing and proportions. No redesign, no new props, no flame or warm light, no text, no background or floor shadow. Genuinely transparent PNG. Keep same portrait 3:4 canvas and full body placement. Clean antialiased natural painted edges, no colored fringe or white halo.

hero-shield:

> Use case: identity-preserve. Supplied image is the EDIT TARGET, existing full-body transparent game sprite. Cleanup ONLY: soften crunchy tiny jagged speckles in fabric, snow and silhouette while preserving expressive broad gouache brushwork. Keep exact face, eyes, expression, pose, mittens, scarf, silhouette, costume, feet ground line, proportions, colors and 3:4 framing. Do not restyle or redesign. No flame, orange glow, text, new props, background, floor shadow. Genuinely transparent PNG, carefully antialiased fine hair and scarf fringe, no colored halo. Reduce noise, not the painted detail.

## Acceptance

Compare navy and grey opaque composites, not RGB hidden under near-zero alpha. Run `node scripts/qa-kienaide-image-noise.mjs`; inspect resulting before/after sheets and live gameplay. Silhouette IoU >0.98; interior high-frequency ratio between 0.3 and 0.9 is a coarse regression gate, not proof of perceptual quality or exact identity. Eye and fabric details are slightly smoother; automated image metrics do not establish whether players prefer this version.
