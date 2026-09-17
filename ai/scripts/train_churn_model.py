import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os
import json

# Generate mock dataset 900
np.random.seed(42)
N = 900
tenure = np.random.randint(1, 73, N)
monthly_charges = np.random.uniform(20.0, 120.0, N)
contract_type = np.random.choice(['Month-to-month', 'One year', 'Two year'], N, p=[0.55, 0.25, 0.20])
payment_method = np.random.choice(['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'], N)

# Synthetic logic for churn
churn_prob = np.zeros(N)
churn_prob += np.where(contract_type == 'Month-to-month', 0.4, 0.0)
churn_prob += np.where(tenure < 12, 0.3, 0.0)
churn_prob += np.where(monthly_charges > 80, 0.2, 0.0)
churn_prob -= np.where(tenure > 48, 0.2, 0.0)
churn_prob = np.clip(churn_prob, 0, 1)

churn = (np.random.rand(N) < churn_prob).astype(int)

df = pd.DataFrame({
    'tenure': tenure,
    'MonthlyCharges': monthly_charges,
    'Contract': contract_type,
    'PaymentMethod': payment_method,
    'Churn': churn
})

# Feature engineering
df = pd.get_dummies(df, columns=['Contract', 'PaymentMethod'])

X = df.drop('Churn', axis=1)
y = df['Churn']

# Save feature names
features = list(X.columns)
with open('ai/app/features/retention/model_features.json', 'w') as f:
    json.dump(features, f)

# Train XGBoost
model = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
model.fit(X, y)

# Save model
joblib.dump(model, 'ai/app/features/retention/churn_model.pkl')

print("Model trained and saved to ai/app/features/retention/churn_model.pkl")
