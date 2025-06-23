import shap
import matplotlib.pyplot as plt
import os
import pandas as pd
from django.conf import settings

def generate_shap_values(model, input_dict):
    try:
        expected_features = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]
        input_df = pd.DataFrame([[float(input_dict.get(f, 0)) for f in expected_features]], columns=expected_features)

        explainer = shap.Explainer(model, input_df)
        shap_values = explainer(input_df)

        result = {
            "features": expected_features,
            "shap_values": shap_values.values[0].tolist()  # 각 feature에 대한 shap 값
        }
        return result
    except Exception as e:
        print("SHAP 생성 오류:", e)
        return None
