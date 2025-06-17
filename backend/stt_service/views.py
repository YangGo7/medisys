# views.py (Django DRF)
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import get_object_or_404
from dr_reports.models import DrReport
import os
import whisper
import google.generativeai as genai
import datetime

# Whisper 모델 로딩 (서버 시작 시 1회)
whisper_model = whisper.load_model("small")

# Gemini 설정
genai.configure(api_key="AIzaSyCstFaoQkLtW396t2t1rSkC_UuHweQjIbw")
gemini_model = genai.GenerativeModel("models/learnlm-2.0-flash-experimental")

# 보정 함수
def gemini_correct(text, patient_id, study_uid):
    prompt = f"""
다음은 흉부 엑스레이 STT 결과입니다.
전문적인 판독 소견으로 자연스럽게 정리하고, 아래 정보와 함께 태깅하세요:

- 환자 ID: {patient_id}
- Study UID: {study_uid}
- 판독 날짜: {datetime.date.today()}

입력: {text}
"""
    response = gemini_model.generate_content(prompt)
    return response.text.strip()

@api_view(['POST'])
@parser_classes([MultiPartParser])
def stt_upload(request):
    audio_file = request.FILES.get('audio')
    patient_id = request.POST.get('patient_id', 'Unknown')
    study_uid = request.POST.get('study_uid', 'Unknown')

    if not audio_file:
        return Response({"status": "error", "message": "audio file missing"}, status=400)

    audio_path = default_storage.save(f'temp/{audio_file.name}', audio_file)
    abs_path = default_storage.path(audio_path)

    try:
        result = whisper_model.transcribe(abs_path)
        original = result['text']
        corrected = gemini_correct(original, patient_id, study_uid)

        # DrReport에 저장 (있으면 업데이트, 없으면 생성)
        with transaction.atomic():
            report, created = DrReport.objects.update_or_create(
                study_uid=study_uid,
                defaults={
                    'patient_id': patient_id,
                    'dr_report': corrected,
                    'report_status': 'draft'
                }
            )

    finally:
        os.remove(abs_path)

    return Response({
        "status": "success",
        "original_text": original,
        "corrected_text": corrected,
        "report_id": report.id,
        "created": created,
    })
