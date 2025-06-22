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
    if test_type not in MODELS:
        return "모델 없음"

    try:
        model = MODELS[test_type]
        input_vector = [float(input_dict.get(comp, 0)) for comp in PANEL_ORDER[test_type]]
        
        df = pd.DataFrame([input_vector], columns=PANEL_ORDER[test_type])
        return str(model.predict(df)[0])
    except Exception as e:
        return f"오류: {e}"
