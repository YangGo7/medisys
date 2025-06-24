# lis_cdss/inference/importance_view.py
import joblib
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from lis_cdss.models import LiverFunctionSample
from lis_cdss.inference.blood_inference import MODELS
from .manual_contributions import get_manual_contributions

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
        sample = LiverFunctionSample.objects.get(id=sample_id)

        # 입력값 딕셔너리
        input_dict = {
            "ALT": sample.ALT,
            "AST": sample.AST,
            "ALP": sample.ALP,
            "Total Bilirubin": sample.Total_Bilirubin,
            "Direct Bilirubin": sample.Direct_Bilirubin,
            "Albumin": sample.Albumin,
        }

        # 모델 및 배경 데이터 로드
        model = joblib.load('lis_cdss/inference/lft_logistic_model.pkl')
        background_df = pd.read_csv('lis_cdss/inference/lft_training_data.csv')

        # 기여도 계산
        result = get_manual_contributions(model, input_dict, background_df)

        if result is None:
            return Response({"error": "기여도 계산 실패"}, status=500)

        return Response(result)

    except LiverFunctionSample.DoesNotExist:
        return Response({"error": "Sample not found"}, status=404)