# lis_cdss/inference/blood_inference.py
import os
import pandas as pd
import joblib
from django.conf import settings  # BASE_DIR 접근 가능

MODEL_PATHS = {
    "LFT": os.path.join(settings.BASE_DIR, "lis_cdss", "inference", "lft_logistic_model.pkl"),
}

PANEL_ORDER = {
    "LFT": ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]
}

MODELS = {name: joblib.load(path) for name, path in MODEL_PATHS.items()}

def run_blood_model(test_type, input_dict):
    test_type = test_type.upper()
    if test_type not in MODELS:
        return None, None

    try:
        model = MODELS[test_type]
        input_vector = [float(input_dict.get(comp, 0)) for comp in PANEL_ORDER[test_type]]
        
        df = pd.DataFrame([input_vector], columns=PANEL_ORDER[test_type])
        
        pred = int(model.predict(df)[0])
        prob = float(model.predict_proba(df)[0][1]) 
        
        return pred, prob
    except Exception as e:
        print(f"❌ 예측 실패: {e}")
        return None, None
