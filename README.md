[README_Mental_Distress.md](https://github.com/user-attachments/files/27139123/README_Mental_Distress.md)
# Predicting Mental Distress Using Depression and Financial Stress Among Adults in the United States

A state-level regression study testing whether **depression rates** and a composite **"financial threat"** index jointly predict the prevalence of frequent mental distress across the United States.

> Accepted as an in-person poster presentation at the **31st Annual Undergraduate & Graduate Research Symposium**, Morgan State University — *Spring into Research Week, April 13, 2026.*

---

## Authors

- **Mingma Lama**
- Daniel Owolabi
- **Prof. Radhouane Chouchane** (faculty mentor)

Department of Computer Science, Morgan State University, Baltimore, MD 21251

---

## Research Question

Mental distress is a major U.S. public health concern, and depression is a well-established predictor of poor mental-health outcomes. The role of **economic hardship** in driving mental distress, however, is less explored in predictive-modeling contexts.

**Hypothesis:** *States with higher rates of depression and financial stress will show higher rates of frequent mental distress.*

We test whether **combining** depression and a composite financial-stress measure produces a stronger predictive model than either factor on its own.

---

## Data

- **Source:** CDC PLACES — *Local Data for Better Health, County Data, 2025 release.*
- **File used:** `PLACES__Local_Data_for_Better_Health__County_Data__2025_release.csv`
- **Granularity for the main model:** state-level — 50 U.S. states + the District of Columbia + a national aggregate (**n = 52 observations**, 41 training / 11 test).
- **Filter:** measures restricted to `Data_Value_Type == "Crude prevalence"`.
- **Reshape:** long-format CDC data pivoted with Pandas so each row is a state and each column is a measure.
- **Missing values:** column-mean imputation on the pivoted matrix.

The notebook also includes county-level exploration for the state of Maryland and a side analysis of factors correlated with stroke prevalence — these are exploratory and not part of the headline mental-distress model.

---

## Features

**Predictors (X):**

| Feature | Definition |
|---|---|
| `Depression among adults` | CDC PLACES crude prevalence (%) |
| `financial_threat` | Composite — see formula below |

**Composite feature — `financial_threat`:**

```
financial_threat =  (Housing insecurity (12mo)
                    + Utility shut-off threat (12mo)
                    + Food insecurity (12mo)
                    + Received food stamps (12mo))  / 4
```

All four components are CDC PLACES *crude prevalence* percentages.

**Target (y):** `Frequent mental distress among adults` (CDC PLACES crude prevalence, %).

---

## Methods

- **Library:** `scikit-learn`.
- **Train / test split:** `train_test_split(X, y, test_size=0.2, random_state=42)` — single 80/20 hold-out, no cross-validation.
- **Models:**
  - **Linear Regression** (`sklearn.linear_model.LinearRegression`) — primary model; coefficients are directly interpretable.
  - **Random Forest** (`sklearn.ensemble.RandomForestRegressor(random_state=42)`) — benchmark.
- **Metrics:** R², MSE, RMSE on the held-out 11-state test set.

### Pipeline (linear model)

```python
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

X = pivot[["Depression among adults", "financial_threat"]]
y = pivot["Frequent mental distress among adults"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = LinearRegression().fit(X_train, y_train)
y_pred = model.predict(X_test)

print("R²  :", r2_score(y_test, y_pred))
print("RMSE:", mean_squared_error(y_test, y_pred) ** 0.5)
```

---

## Results

**Fitted equation (state-level model):**

```
Mental Distress = 6.163 + (0.313 × Depression) + (0.277 × Financial Threat)
```

- Both predictors are **positively associated** with frequent mental distress.
- A one-percentage-point increase in state depression prevalence is associated with a ~0.31 pp increase in frequent mental distress, holding financial threat fixed.
- A one-unit increase in the financial-threat index is associated with a ~0.28 pp increase, holding depression fixed.

R² and RMSE values for the linear model and the Random Forest benchmark are printed in the notebook (`Health.ipynb`, cells 45–47).

---

## Repository Contents

```
.
├── Health.ipynb     # main analysis notebook (Colab-compatible)
└── README.md        # this file
```

The notebook is laid out as: data load → exploratory filtering → Maryland-county exploration → stroke-correlation side analysis → state-level pivot → composite-feature construction → linear regression → random-forest benchmark.

---

## How to Reproduce

1. **Get the data.** Download the CDC PLACES *County Data, 2025 release* from the CDC Open Data Portal:
   <https://chronicdata.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb>

2. **Open the notebook** in Google Colab or any Jupyter environment.

3. **Update the path** in the data-load cell to point to your copy of the CSV:
   ```python
   d = "path/to/PLACES__Local_Data_for_Better_Health__County_Data__2025_release.csv"
   da = pd.read_csv(d, low_memory=False)
   ```

4. **Run all cells** top-to-bottom.

### Requirements

```
pandas
numpy
matplotlib
seaborn
scikit-learn
```

---

## Limitations

- **Small sample size** for the headline model (n = 52), reflecting the choice of state-level analysis. Results should be interpreted with that statistical-power constraint in mind.
- **Cross-sectional design** — relationships are correlational, not causal.
- **Aggregate data.** State-level prevalences average over enormous within-state variation; individual-level inferences are not warranted.
- **Single hold-out split.** Cross-validation would give a more stable estimate of generalization error.

---

## Acknowledgments

This research was conducted under the mentorship of **Prof. Radhouane Chouchane** in the Department of Computer Science at Morgan State University, and benefited from the support of the Morgan State Office of Undergraduate Research, which administers Spring into Research Week.

---

## Citation

If you reference this work, please cite:

> Lama, M., Owolabi, D., & Chouchane, R. (2026). *Predicting Mental Distress Using Depression and Financial Stress Among Adults in the United States.* Poster, 31st Annual Undergraduate & Graduate Research Symposium, Morgan State University, Baltimore, MD.
