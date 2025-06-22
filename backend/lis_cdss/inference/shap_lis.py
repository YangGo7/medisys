import shap
import matplotlib.pyplot as plt
import os
import pandas as pd
from django.conf import settings

def generate_shap_image(model, input_dict, sample_id):
    try:
        # ⚠️ SHAP은 전체 feature 구조(X_train 열 순서)가 필요
        expected_features = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]  # 사용한 feature 순서
        input_df = pd.DataFrame([[float(input_dict.get(feat, 0)) for feat in expected_features]], columns=expected_features)

        # 🔍 explainer 생성 및 shap 값 계산
        explainer = shap.Explainer(model, input_df)
        shap_values = explainer(input_df)

        # 📈 그래프 저장
        plt.clf()
        shap.plots.beeswarm(shap_values, show=False)
        output_dir = os.path.join(settings.MEDIA_ROOT, "shap_plots")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"sample_{sample_id}.png")
        plt.savefig(output_path)

        # ✅ React가 접근할 수 있는 URL 반환
        return f"{settings.MEDIA_URL}shap_plots/sample_{sample_id}.png"

    except Exception as e:
        print("SHAP 생성 오류:", e)
        return None
