# lis_cdss/inference/importance_view.py
import joblib
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from lis_cdss.models import LiverFunctionSample
from lis_cdss.inference.blood_inference import MODELS
from .shap_lis import generate_shap_values

@api_view(['GET'])
def get_logistic_importance(request):
    model = joblib.load('lis_cdss/inference/lft_logistic_model.pkl')
    feature_names = joblib.load('lis_cdss/inference/feature_names.joblib')

    coefs = model.coef_[0]
    df = pd.DataFrame({
        'feature': feature_names,
        'importance': coefs
    }).sort_values(by='importance', key=abs, ascending=False)

    return Response(df.to_dict(orient='records'))


@api_view(['GET'])
def get_sample_contributions(request, sample_id):
    try:
        # 샘플 불러오기
        sample = LiverFunctionSample.objects.get(id=sample_id)

        # SHAP용 입력 딕셔너리 (사람이 읽기 쉬운 이름 → 모델에 쓰이는 이름 유지)
        input_dict = {
            "ALT": sample.ALT,
            "AST": sample.AST,
            "ALP": sample.ALP,
            "Total Bilirubin": sample.Total_Bilirubin,
            "Direct Bilirubin": sample.Direct_Bilirubin,
            "Albumin": sample.Albumin,
        }

        # SHAP 계산용 모델 및 feature 순서 정의
        model = MODELS["LFT"]
        feature_names = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]

        # Django 모델 필드 이름 → DB 실제 필드명
        db_fields = {
            "ALT": "ALT",
            "AST": "AST",
            "ALP": "ALP",
            "Albumin": "Albumin",
            "Total Bilirubin": "Total_Bilirubin",
            "Direct Bilirubin": "Direct_Bilirubin",
        }

        # DB에서 background_df 생성 (컬럼명 매핑하여 순서 맞춤)
        background_queryset = LiverFunctionSample.objects.values(*db_fields.values()).exclude(**{k: None for k in db_fields.values()})
        background_df = pd.DataFrame(list(background_queryset))
        background_df.columns = [k for k in db_fields]  # 컬럼명 다시 사람이 읽기 쉬운 이름으로

        # SHAP 값 계산
        result = generate_shap_values(model, input_dict, background_df)

        if result is None:
            return Response({"error": "SHAP 계산 실패"}, status=500)

        return Response(result)

    except LiverFunctionSample.DoesNotExist:
        return Response({"error": "Sample not found"}, status=404)