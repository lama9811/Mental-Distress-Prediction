# Wellbeing — Mental Distress Prediction Dashboard

An interactive companion to *Predicting Mental Distress Using Depression and
Financial Stress Among Adults in the United States* (Lama, Owolabi, Chouchane —
Morgan State University, Spring into Research Week 2026).

The dashboard runs the state-level linear regression from `Health.ipynb`
**entirely in the browser** — no Python, no server, no build step.

```
distress = 6.163 + 0.313 · depression + 0.277 · financial_threat
```

(state-level OLS, n = 52, R² = 0.722, RMSE = 0.532)

---

## Run locally

Open `index.html` in any modern browser. That's it.

If your browser blocks loading `app.js` over the `file://` scheme (some do for
ES modules / CORS), serve the folder with any static server:

```bash
# from this directory
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Deploy to GitHub Pages

1. Commit `index.html`, `app.js`, `styles.css`, and `README.md` to your
   `Mental-Distress-Prediction` repo (or a dedicated dashboard branch).
2. On GitHub: **Settings → Pages → Build and deployment → Branch: `main` / `/ (root)`**.
3. Visit `https://lama9811.github.io/Mental-Distress-Prediction/`.

No build pipeline needed — the page uses Tailwind via the Play CDN and
Google Fonts directly.

---

## File map

| File         | Role                                                              |
|--------------|-------------------------------------------------------------------|
| `index.html` | Markup, Tailwind config, custom theme tokens, font imports.       |
| `app.js`     | Locked model coefficients, slider handlers, SVG scatter chart.    |
| `styles.css` | Range-slider styling, paper-grain texture, entrance animations.   |
| `README.md`  | You are here.                                                     |

---

## Updating the model

Edit `MODEL` at the top of `app.js`:

```js
const MODEL = Object.freeze({
  intercept: 6.162857696868079,
  depCoef:   0.31342386,
  finCoef:   0.27670656,
});
```

These were copied verbatim from cell 47 of `Health.ipynb`. Re-running the
notebook with a different `random_state` or different filtering will produce
different coefficients — re-paste them here if so.

The 11 hold-out test points in `TEST_SET` come from the same cell's
`Y_1_test.values` and `Y_1_pred`.

---

## Credits

- **Data:** CDC PLACES — *Local Data for Better Health, County Data,
  2025 release.*
- **Model & notebook:** Mingma Lama, Daniel Owolabi.
- **Mentorship:** Prof. Radhouane Chouchane, Dept. of Computer Science,
  Morgan State University.
