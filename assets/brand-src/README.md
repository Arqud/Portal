# Brand source logos

Source logos for the per-brand portal icons + share cards. Run
`npm run gen:icons` (see `scripts/gen-brand-icons.mjs`) to regenerate the
committed assets under `public/brand/<brand>/`.

| File | Brand | Notes |
|---|---|---|
| `arqud-logo.jpg` | ARQUD | Black wordmark on white → thresholded + inverted to white glyphs, screen-composited so no box shows on the dark tile |
| `wewash-logo.png` | We Wash Cars | Gold/silver "Generic" logo on transparent |
| `sparkling-logo.png` | Sparkling Auto Care Centres | Blue/grey "Generic" logo on transparent |

To swap a logo: drop a replacement here with the same filename (or update the
`BRANDS` array in `scripts/gen-brand-icons.mjs`) and re-run `npm run gen:icons`.
