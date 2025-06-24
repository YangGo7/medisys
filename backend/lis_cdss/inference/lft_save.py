
import os
import sys
import pandas as pd
import django

# 🔧 /home/medical_system/backend를 모듈 경로에 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

# ✅ settings 모듈 경로 정확히 지정 (두 번 쓰지 말고!)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

django.setup()

from lis_cdss.inference.blood_inference import run_blood_model, MODELS
from lis_cdss.models import LiverFunctionSample

# CSV 파일 경로 (절대경로로 바꿔도 됨)
csv_path = "/home/medical_system/backend/lis_data/lft_data.csv"

# 컬럼명 매핑
COLUMN_MAP = {
    'ALT': 'ALT (U/L)',
    'AST': 'AST (U/L)',
    'ALP': ' ALP (U/L)',
    'Albumin': 'Albumin (g/dL)',
    'Total Bilirubin': 'Total Bilirubin (mg/dL)',
    'Direct Bilirubin': 'Direct Bilirubin (mg/dL)',
}

# 데이터 불러오기
df = pd.read_csv(csv_path)

# 필요한 컬럼만 추출 후 결측치 제거
df = df[[COLUMN_MAP[k] for k in COLUMN_MAP]].dropna()

samples = []

for i, row in df.iterrows():
    features = {key: row[COLUMN_MAP[key]] for key in COLUMN_MAP}

    # 예측 실행
    pred = run_blood_model("LFT", features)

    if isinstance(pred, str) and pred.startswith("오류"):
        print(f"❌ 예측 실패 @ index {i}: {pred}")
        continue

    try:
        model = MODELS["LFT"]
        ordered_cols = ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Albumin"]
        X = pd.DataFrame([[features[col] for col in ordered_cols]], columns=ordered_cols)
        prob = float(model.predict_proba(X)[0][1])
    except Exception as e:
        print(f"❌ 확률 계산 실패 @ index {i}: {e}")
        continue

    sample = LiverFunctionSample(
        ALT=features["ALT"],
        AST=features["AST"],
        ALP=features["ALP"],
        Albumin=features["Albumin"],
        Total_Bilirubin=features["Total Bilirubin"],
        Direct_Bilirubin=features["Direct Bilirubin"],
        prediction=bool(pred),
        probability=prob
    )
    samples.append(sample)

# 저장
print(f"✅ 저장 대상 {len(samples)}개")
LiverFunctionSample.objects.bulk_create(samples)
print("✅ DB 저장 완료")
