# Wellbeing — Mental Distress Prediction Dashboard

An interactive companion to *Predicting Mental Distress Using Depression and
Financial Stress Among Adults in the United States* (Lama, Poudel, Owolabi, Chouchane —
Morgan State University, Spring into Research Week 2026).

The dashboard keeps the state-level regression from `Health.ipynb` as its
default experience and adds the county analysis as a secondary view. Both run
**entirely in the browser** after the county bundle has been generated.

```
distress = 6.163 + 0.313 · depression + 0.277 · financial_threat
```

(state-level OLS, n = 52, R² = 0.722, RMSE = 0.532)

The County toggle uses the complete-case model from
`notebooks/county_wise_analysis.ipynb`:

```
distress = 5.271 + 0.364 · depression + 0.276 · financial_hardship
```

(county-level OLS, n = 2,299, cross-validated R² = 0.790, RMSE = 0.908)

The state and county analyses come from the same CDC PLACES County Data 2025
release. The county build deliberately uses the notebook's six measures,
crude-prevalence filter, financial-hardship formula, and complete-case rules.

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

1. Commit `index.html`, `app.js`, `styles.css`, `data.js`, and
   `county-data.js` to your `Mental-Distress-Prediction` repo (or a dedicated
   dashboard branch).
2. On GitHub: **Settings → Pages → Build and deployment → Branch: `main` / `/ (root)`**.
3. Visit `https://lama9811.github.io/Mental-Distress-Prediction/`.

No build pipeline needed — the page uses Tailwind via the Play CDN and
Google Fonts directly.

---

## File map

| File         | Role                                                              |
|--------------|-------------------------------------------------------------------|
| `index.html` | Markup, Tailwind config, custom theme tokens, font imports.       |
| `app.js`     | State/county controls, locked model coefficients, and SVG maps.    |
| `data.js`    | Existing state-level observations.                                |
| `county-data.js` | Generated county observations used by the dashboard.        |
| `scripts/build_county_data.py` | Rebuilds `county-data.js` from the CDC CSV. |
| `styles.css` | Range-slider styling, paper-grain texture, entrance animations.   |
| `DASHBOARD.md` | You are here.                                                   |

---

## Updating the model

The two locked models live in `MODELS` at the top of `app.js`. The county
coefficients are copied at full precision from the county notebook.

To regenerate county dashboard data after rerunning or replacing the CDC file:

```bash
python scripts/build_county_data.py
```

The script expects `data/places_county_2025.csv`. That large source file stays
ignored by Git; the compact generated `county-data.js` is committed so the
static dashboard does not need a database or a 51 MB download at runtime.

The state model is:

```js
state: Object.freeze({
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
- **Model & notebooks:** Mingma Lama, Aditya Poudel, Daniel Owolabi.
- **Mentorship:** Prof. Radhouane Chouchane, Dept. of Computer Science,
  Morgan State University.
