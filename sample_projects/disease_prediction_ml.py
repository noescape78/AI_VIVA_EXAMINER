"""
Medical Diagnostic & Disease Prediction Engine
Tech Stack: Python, Scikit-Learn, Pandas, NumPy
Author: Student Research Team
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

class DiseasePredictor:
    def __init__(self, n_estimators=100, random_state=42):
        self.scaler = StandardScaler()
        # Edge question: Why Random Forest over SVM or XGBoost?
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=8,
            min_samples_split=5,
            class_weight="balanced", # Handling skewed medical datasets
            random_state=random_state
        )
        self.is_trained = False

    def preprocess_features(self, X: np.ndarray, fit_scaler: bool = False) -> np.ndarray:
        # Replaces missing values using median imputation
        X_clean = np.nan_to_num(X, nan=np.nanmedian(X, axis=0))
        if fit_scaler:
            return self.scaler.fit_transform(X_clean)
        return self.scaler.transform(X_clean)

    def train(self, X: np.ndarray, y: np.ndarray):
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, stratify=y, random_state=42
        )
        
        X_train_scaled = self.preprocess_features(X_train, fit_scaler=True)
        X_val_scaled = self.preprocess_features(X_val, fit_scaler=False)
        
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        val_preds = self.model.predict(X_val_scaled)
        val_probs = self.model.predict_proba(X_val_scaled)[:, 1]
        
        metrics = {
            "roc_auc": float(roc_auc_score(y_val, val_probs)),
            "report": classification_report(y_val, val_preds, output_dict=True)
        }
        return metrics

    def predict_risk_score(self, patient_biomarkers: np.ndarray) -> dict:
        if not self.is_trained:
            raise ValueError("Model has not been trained yet.")
        scaled_input = self.preprocess_features(patient_biomarkers, fit_scaler=False)
        risk_probability = self.model.predict_proba(scaled_input)[0][1]
        
        # Risk Stratification Tier
        risk_tier = "LOW"
        if risk_probability >= 0.75:
            risk_tier = "CRITICAL"
        elif risk_probability >= 0.45:
            risk_tier = "MODERATE"
            
        return {
            "risk_score_percentage": round(risk_probability * 100, 2),
            "tier": risk_tier,
            "top_risk_feature_indices": np.argsort(self.model.feature_importances_)[::-1][:3].tolist()
        }
