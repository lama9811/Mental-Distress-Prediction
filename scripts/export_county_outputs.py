"""Reproduce and export the county-analysis tables and figures."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import statsmodels.api as sm
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "places_county_2025.csv"
FIGURE_DIR = ROOT / "outputs" / "figures"
TABLE_DIR = ROOT / "outputs" / "tables"

STUDY_MEASURES = {
    "depression": "Depression among adults",
    "housing": "Housing insecurity in the past 12 months among adults",
    "utility": "Utility services shut-off threat in the past 12 months among adults",
    "food": "Food insecurity in the past 12 months among adults",
    "stamps": "Received food stamps in the past 12 months among adults",
    "distress": "Frequent mental distress among adults",
}
FINANCIAL_COMPONENTS = ["housing", "utility", "food", "stamps"]
MODEL_FEATURES = {
    "Depression only": ["depression"],
    "Financial hardship only": ["financial_hardship"],
    "Combined": ["depression", "financial_hardship"],
}


def build_analysis_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(DATA_PATH, low_memory=False)
    county_long = df.loc[
        df["Measure"].isin(STUDY_MEASURES.values())
        & df["Data_Value_Type"].eq("Crude prevalence")
        & df["LocationName"].notna()
        & df["StateAbbr"].ne("US")
    ].copy()

    key = ["StateAbbr", "StateDesc", "LocationID", "LocationName"]
    county_wide = county_long.pivot(
        index=key,
        columns="Measure",
        values="Data_Value",
    ).reset_index()
    county_wide.columns.name = None
    county_wide = county_wide.rename(
        columns={full_name: short_name for short_name, full_name in STUDY_MEASURES.items()}
    )

    population = county_long[
        ["StateAbbr", "LocationID", "TotalPopulation", "TotalPop18plus"]
    ].drop_duplicates()
    county_wide = county_wide.merge(
        population,
        on=["StateAbbr", "LocationID"],
        how="left",
        validate="one_to_one",
    )
    county_complete = county_wide.dropna(subset=list(STUDY_MEASURES)).copy()
    county_complete["financial_hardship"] = county_complete[FINANCIAL_COMPONENTS].mean(axis=1)

    if len(county_complete) != 2_299:
        raise ValueError(f"Expected 2,299 complete counties, found {len(county_complete):,}")
    return county_wide, county_complete


def cross_validated_models(counties: pd.DataFrame):
    y = counties["distress"]
    groups = counties["StateAbbr"]
    logo = LeaveOneGroupOut()
    predictions = {}
    comparison_rows = []
    state_rows = []

    for model_name, features in MODEL_FEATURES.items():
        prediction = cross_val_predict(
            LinearRegression(), counties[features], y, groups=groups, cv=logo
        )
        predictions[model_name] = prediction
        comparison_rows.append(
            {
                "Model": model_name,
                "Predictors": ", ".join(features),
                "R2": r2_score(y, prediction),
                "RMSE": mean_squared_error(y, prediction) ** 0.5,
                "MAE": mean_absolute_error(y, prediction),
            }
        )
        temporary = counties[["StateAbbr", "distress"]].copy()
        temporary["prediction"] = prediction
        temporary["absolute_error"] = (temporary["distress"] - prediction).abs()
        temporary["squared_error"] = (temporary["distress"] - prediction) ** 2
        metrics = temporary.groupby("StateAbbr").agg(
            counties=("distress", "size"),
            MAE=("absolute_error", "mean"),
            MSE=("squared_error", "mean"),
        ).reset_index()
        metrics["RMSE"] = np.sqrt(metrics["MSE"])
        metrics["Model"] = model_name
        state_rows.append(metrics)

    comparison = pd.DataFrame(comparison_rows).sort_values("RMSE").reset_index(drop=True)
    state_metrics = pd.concat(state_rows, ignore_index=True)
    return predictions, comparison, state_metrics


def save_figures(counties: pd.DataFrame, correlations: pd.DataFrame) -> None:
    sns.set_theme(style="whitegrid")

    fig, axes = plt.subplots(1, 3, figsize=(15, 4))
    for column, axis in zip(["depression", "financial_hardship", "distress"], axes):
        sns.histplot(data=counties, x=column, bins=30, kde=True, ax=axis)
        axis.set_title(column.replace("_", " ").title())
        axis.set_xlabel("Crude prevalence (%)")
        axis.set_ylabel("Number of counties")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "county_measure_distributions.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    fig, axis = plt.subplots(figsize=(9, 7))
    sns.heatmap(correlations, annot=True, fmt=".2f", cmap="vlag", center=0, square=True, ax=axis)
    axis.set_title("County-Level Correlations Among Study Measures")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "county_measure_correlations.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    minimum = min(counties["distress"].min(), counties["combined_cv_prediction"].min())
    maximum = max(counties["distress"].max(), counties["combined_cv_prediction"].max())
    fig, axis = plt.subplots(figsize=(7, 6))
    sns.scatterplot(
        data=counties,
        x="distress",
        y="combined_cv_prediction",
        hue="StateAbbr",
        legend=False,
        alpha=0.65,
        s=35,
        ax=axis,
    )
    axis.plot([minimum, maximum], [minimum, maximum], linestyle="--", color="black", label="Perfect prediction")
    axis.set_xlabel("Observed frequent mental distress (%)")
    axis.set_ylabel("Cross-validated prediction (%)")
    axis.set_title("Observed vs. Predicted County Mental Distress")
    axis.legend()
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "county_observed_vs_predicted.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    sns.scatterplot(
        data=counties,
        x="combined_cv_prediction",
        y="combined_cv_residual",
        alpha=0.5,
        s=30,
        ax=axes[0],
    )
    axes[0].axhline(0, color="black", linestyle="--")
    axes[0].set_title("Residuals vs. Predicted Values")
    axes[0].set_xlabel("Cross-validated prediction (%)")
    axes[0].set_ylabel("Observed − predicted (%)")
    sns.histplot(data=counties, x="combined_cv_residual", bins=30, kde=True, ax=axes[1])
    axes[1].axvline(0, color="black", linestyle="--")
    axes[1].set_title("Distribution of Cross-Validated Residuals")
    axes[1].set_xlabel("Observed − predicted (%)")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "county_residual_diagnostics.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    county_wide, counties = build_analysis_data()
    predictions, comparison, state_metrics = cross_validated_models(counties)
    counties["combined_cv_prediction"] = predictions["Combined"]
    counties["combined_cv_residual"] = counties["distress"] - counties["combined_cv_prediction"]

    correlation_columns = [
        "depression", "housing", "utility", "food", "stamps", "financial_hardship", "distress"
    ]
    correlations = counties[correlation_columns].corr()
    missingness = pd.DataFrame(
        {
            "missing_count": county_wide[list(STUDY_MEASURES)].isna().sum(),
            "missing_percent": county_wide[list(STUDY_MEASURES)].isna().mean() * 100,
        }
    ).rename_axis("measure").reset_index()
    state_balanced = state_metrics.groupby("Model").agg(
        mean_state_RMSE=("RMSE", "mean"),
        median_state_RMSE=("RMSE", "median"),
        mean_state_MAE=("MAE", "mean"),
        median_state_MAE=("MAE", "median"),
    ).sort_values("mean_state_RMSE")
    state_rmse = state_metrics.pivot(index="StateAbbr", columns="Model", values="RMSE")
    state_bias = counties.groupby("StateAbbr").agg(
        counties=("LocationID", "size"),
        mean_residual=("combined_cv_residual", "mean"),
        mean_absolute_residual=("combined_cv_residual", lambda values: values.abs().mean()),
    ).sort_values("mean_absolute_residual", ascending=False)

    inference_x = sm.add_constant(counties[["depression", "financial_hardship"]])
    clustered = sm.OLS(counties["distress"], inference_x).fit(
        cov_type="cluster", cov_kwds={"groups": counties["StateAbbr"]}
    )
    intervals = clustered.conf_int()
    coefficients = pd.DataFrame(
        {
            "coefficient": clustered.params,
            "clustered_standard_error": clustered.bse,
            "p_value": clustered.pvalues,
            "ci_lower_95": intervals[0],
            "ci_upper_95": intervals[1],
        }
    ).rename_axis("term").reset_index()

    standardized = counties[["depression", "financial_hardship", "distress"]].copy()
    standardized.loc[:, :] = StandardScaler().fit_transform(standardized)
    standardized_x = sm.add_constant(standardized[["depression", "financial_hardship"]])
    standardized_model = sm.OLS(standardized["distress"], standardized_x).fit(
        cov_type="cluster", cov_kwds={"groups": counties["StateAbbr"]}
    )
    standardized_coefficients = pd.DataFrame(
        {
            "standardized_coefficient": standardized_model.params,
            "clustered_standard_error": standardized_model.bse,
            "p_value": standardized_model.pvalues,
        }
    ).rename_axis("term").reset_index()

    exports = {
        "county_missingness_summary.csv": missingness,
        "county_measure_correlations.csv": correlations.rename_axis("measure").reset_index(),
        "county_model_comparison.csv": comparison,
        "county_state_balanced_model_comparison.csv": state_balanced.reset_index(),
        "county_state_model_metrics.csv": state_metrics.sort_values(["Model", "RMSE"], ascending=[True, False]),
        "county_combined_not_better_than_depression.csv": state_rmse.loc[state_rmse["Combined"] >= state_rmse["Depression only"]].reset_index(),
        "county_combined_not_better_than_financial.csv": state_rmse.loc[state_rmse["Combined"] >= state_rmse["Financial hardship only"]].reset_index(),
        "county_state_residual_bias.csv": state_bias.reset_index(),
        "county_clustered_coefficients.csv": coefficients,
        "county_standardized_coefficients.csv": standardized_coefficients,
        "county_predictions.csv": counties[
            [
                "StateAbbr", "StateDesc", "LocationID", "LocationName", "TotalPopulation", "TotalPop18plus",
                "depression", "housing", "utility", "food", "stamps", "financial_hardship", "distress",
                "combined_cv_prediction", "combined_cv_residual",
            ]
        ].sort_values(["StateAbbr", "LocationName", "LocationID"]),
    }
    for filename, table in exports.items():
        table.to_csv(TABLE_DIR / filename, index=False, float_format="%.6f")

    save_figures(counties, correlations)
    print(f"Exported {len(exports)} tables to {TABLE_DIR}")
    print(f"Exported 4 figures to {FIGURE_DIR}")


if __name__ == "__main__":
    main()
