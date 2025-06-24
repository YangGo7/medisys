# lis_cdss/inference/manual_contributions.py
import joblib
import pandas as pd

def get_manual_contributions(model, input_dict, background_df):
    try:
        # Feature 순서 정의
        feature_names = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]

        # 입력값 정리
        input_values = pd.DataFrame([input_dict])[feature_names].astype(float)

        # 배경 평균값 계산
        mean_values = background_df[feature_names].astype(float).mean()

        # 회귀 계수
        coefs = model.coef_[0]

        # 기여도 = 계수 × (입력값 - 평균값)
        contributions = coefs * (input_values.iloc[0] - mean_values)

        return {
            "features": feature_names,
            "contributions": contributions.tolist()
        }

    except Exception as e:
        print("❌ 기여도 계산 오류:", e)
        return None
