# FreshLens AI - ML Shelf-Life Pipeline

This folder upgrades shelf-life estimation from the current heuristic calculation to a supervised XGBoost regression model.

## Important

The model must be trained only on observed/credible target labels. Do not generate random rows and do not use the existing heuristic shelf-life value as the training target.

`remaining_shelf_life_days` is derived from:

`quality_endpoint_date - observation_date`

once the observed quality endpoint is known.

## Workflow

1. Record real observations with `add_observation.py`.
2. Continue observing physical food samples over time.
3. When the predefined research quality endpoint is reached, enter the endpoint date for the sample's observations.
4. Run `label_shelf_life_dataset.py`.
5. Train only when the dataset has enough independent physical samples: at least 30 labeled rows and 10 unique samples.
6. Run `train_shelf_life_model.py`.
7. The model is saved as `models/shelf_life_xgb.joblib`.
8. `shelf_life_ml.py` provides the prediction function for FastAPI integration.

The training script uses a group-based train/test split by `sample_id`, so repeated observations from one physical food sample are not randomly split across train and test.
