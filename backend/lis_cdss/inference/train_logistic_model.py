import os
import sys
import django
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression

# Django 환경 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from lis_cdss.models import LiverFunctionSample

# DB에서 데이터 가져오기
samples = LiverFunctionSample.objects.all().values(
    'ALT', 'AST', 'ALP', 'Albumin', 'Total_Bilirubin', 'Direct_Bilirubin', 'prediction'
)

# DataFrame으로 변환
df = pd.DataFrame(samples)

# 결측치 제거
df.dropna(inplace=True)

# Feature, Target 분리
X = df[['ALT', 'AST', 'ALP', 'Albumin', 'Total_Bilirubin', 'Direct_Bilirubin']]
y = df['prediction'].astype(int)  # 예측값: 0(정상), 1(이상)

# 모델 학습
model = LogisticRegression(max_iter=1000, class_weight='balanced')
model.fit(X, y)

# 모델 및 feature 이름 저장
joblib.dump(model, 'lis_cdss/inference/lft_logistic_model.pkl')
joblib.dump(X.columns.tolist(), 'lis_cdss/inference/feature_names.joblib')

print("✅ DB 기반 모델 학습 및 저장 완료")
