import shap
import pandas as pd

def generate_shap_values(model, input_dict, background_df):
    try:
        # 사용 순서 고정
        ordered_features = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]

        # input_df 생성 (정확한 순서, float형 보장)
        input_df = pd.DataFrame([[float(input_dict[f]) for f in ordered_features]], columns=ordered_features)

        # background_df도 동일한 순서로 정렬 및 float 변환
        background_df = background_df[ordered_features].astype(float)

        print("✅ SHAP - input_df:")
        print(input_df)
        print("✅ SHAP - bg_df shape:", background_df.shape)
        print(background_df.head())

        # SHAP 계산
        explainer = shap.Explainer(model.predict_proba, background_df)
        shap_values = explainer(input_df)

        return {
            "features": ordered_features,
            "shap_values": shap_values.values[0][1].tolist()  # 클래스 1 기준
        }

    except Exception as e:
        print("❌ SHAP 생성 오류:", e)
        return None
