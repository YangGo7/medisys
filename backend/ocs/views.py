# backend > ocs > views.py

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_datetime
from datetime import datetime
from pymongo import MongoClient
from .models import OCSLog
from .serializers import OCSLogSerializer


class OCSLogListAPIView(ListAPIView):
    serializer_class = OCSLogSerializer

    def get_queryset(self):
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            return OCSLog.objects.filter(patient_id=patient_id).order_by('-request_time')
        return OCSLog.objects.all().order_by('-request_time')


@api_view(['POST'])
def create_log_view(request):
    try:
        data = request.data
        patient_id = data.get('patient_id')
        doctor_id = data.get('doctor_id')
        request_type = data.get('request_type')
        request_detail = data.get('request_detail')

        if not all([patient_id, doctor_id, request_type, request_detail]):
            return Response({"error": "필수 필드 누락"}, status=400)

        client = MongoClient("mongodb://ocs_user:ocs_pass@localhost:27017/?authSource=ocslog")
        db = client["ocslog"]
        logs_collection = db["logs"]

        log_data = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "request_type": request_type,
            "request_detail": request_detail,
            "timestamp": datetime.utcnow()
        }

        result = logs_collection.insert_one(log_data)
        return Response({"message": "로그 저장 완료", "inserted_id": str(result.inserted_id)}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@csrf_exempt
def test_logs_view(request):
    try:
        client = MongoClient("mongodb://ocs_user:ocs_pass@localhost:27017/?authSource=ocslog")
        db = client["ocslog"]
        collection = db["logs"]

        patient_id = request.GET.get("patient_id")
        doctor_id = request.GET.get("doctor_id")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        query = {}
        if patient_id:
            query["patient_id"] = patient_id
        if doctor_id:
            query["doctor_id"] = doctor_id
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = parse_datetime(start_date)
            if end_date:
                query["timestamp"]["$lte"] = parse_datetime(end_date)

        logs = list(collection.find(query, {"_id": 0}))
        return JsonResponse({"logs": logs}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



@api_view(['GET'])
def combined_log_view(request):
    """
    MariaDB의 OCSLog + MongoDB logs 를 통합하여 환자 ID별로 한 줄로 묶어서 반환
    """
    try:
        patient_id = request.GET.get('patient_id')
        doctor_id = request.GET.get('doctor_id')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # === MariaDB에서 요청 로그 가져오기 ===
        mysql_logs = OCSLog.objects.all()
        if patient_id:
            mysql_logs = mysql_logs.filter(patient_id=patient_id)
        if doctor_id:
            mysql_logs = mysql_logs.filter(doctor_id=doctor_id)
        if start_date:
            mysql_logs = mysql_logs.filter(request_time__gte=parse_datetime(start_date))
        if end_date:
            mysql_logs = mysql_logs.filter(request_time__lte=parse_datetime(end_date))

        mysql_dict = {}
        for log in mysql_logs:
            key = log.patient_id
            mysql_dict[key] = {
                "patient_id": log.patient_id,
                "patient_name": getattr(log, 'patient_name', '-'),
                "doctor_id": log.doctor_id,
                "doctor_name": getattr(log, 'doctor_name', '-'),
                "request_type": log.request_type,
                "request_detail": log.request_detail,
                "request_time": log.request_time.strftime('%Y.%m.%d %H:%M')
            }

        # === MongoDB에서 결과 로그 가져오기 ===
        client = MongoClient("mongodb://ocs_user:ocs_pass@localhost:27017/?authSource=ocslog")
        db = client["ocslog"]
        query = {}
        if patient_id:
            query['patient_id'] = patient_id
        if doctor_id:
            query['doctor_id'] = doctor_id
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = parse_datetime(start_date)
            if end_date:
                query["timestamp"]["$lte"] = parse_datetime(end_date)

        mongo_logs = list(db.logs.find(query))

        # === 결과 병합 ===
        combined = []
        seen_patients = set()

        for entry in mysql_dict.values():
            pid = entry["patient_id"]
            result_logs = [ml for ml in mongo_logs if ml["patient_id"] == pid]
            result_details = [ml.get("request_detail", '-') for ml in result_logs]
            result_time = [ml.get("timestamp", '') for ml in result_logs]

            combined.append({
                "patient_id": pid,
                "patient_name": entry["patient_name"],
                "doctor_id": entry["doctor_id"],
                "doctor_name": entry["doctor_name"],
                "request_type": entry["request_type"],
                "request_detail": entry["request_detail"],
                "result_detail": result_details if result_details else ['-'],
                "time": [entry["request_time"]] + [datetime.strptime(rt, '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y.%m.%d %H:%M') if isinstance(rt, str) else rt.strftime('%Y.%m.%d %H:%M') for rt in result_time] if result_time else [entry["request_time"], '-']
            })

            seen_patients.add(pid)

        return Response(combined, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)



# backend > ocs > views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from pymongo import MongoClient
from datetime import datetime
from .models import OCSLog
from dateutil import parser as date_parser  # 날짜 파싱용

@api_view(['GET'])
def combined_log_view(request):
    """
    MariaDB의 OCSLog + MongoDB logs 를 통합하여 환자 ID별로 한 줄로 묶어서 반환
    """
    try:
        patient_id = request.GET.get('patient_id')
        doctor_id = request.GET.get('doctor_id')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # === MariaDB에서 요청 로그 가져오기 ===
        mysql_logs = OCSLog.objects.all()
        if patient_id:
            mysql_logs = mysql_logs.filter(patient_id=patient_id)
        if doctor_id:
            mysql_logs = mysql_logs.filter(doctor_id=doctor_id)
        if start_date:
            mysql_logs = mysql_logs.filter(request_time__gte=parse_datetime(start_date))
        if end_date:
            mysql_logs = mysql_logs.filter(request_time__lte=parse_datetime(end_date))

        mysql_dict = {}
        for log in mysql_logs:
            key = log.patient_id
            mysql_dict[key] = {
                "patient_id": log.patient_id,
                "patient_name": getattr(log, 'patient_name', '-'),
                "doctor_id": log.doctor_id,
                "doctor_name": getattr(log, 'doctor_name', '-'),
                "request_type": log.request_type,
                "request_detail": log.request_detail,
                "request_time": log.request_time.strftime('%Y.%m.%d %H:%M')
            }

        # === MongoDB에서 결과 로그 가져오기 ===
        client = MongoClient("mongodb://ocs_user:ocs_pass@localhost:27017/?authSource=ocslog")
        db = client["ocslog"]
        query = {}
        if patient_id:
            query['patient_id'] = patient_id
        if doctor_id:
            query['doctor_id'] = doctor_id
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = parse_datetime(start_date)
            if end_date:
                query["timestamp"]["$lte"] = parse_datetime(end_date)

        mongo_logs = list(db.logs.find(query, {'_id': 0}))  # _id 제외

        # === 결과 병합 ===
        combined = []

        for entry in mysql_dict.values():
            pid = entry["patient_id"]
            result_logs = [ml for ml in mongo_logs if ml["patient_id"] == pid]
            result_details = [ml.get("request_detail", '-') for ml in result_logs]
            result_time = [ml.get("timestamp", '') for ml in result_logs]

            # 날짜 안전 파싱
            parsed_result_times = []
            for rt in result_time:
                try:
                    if isinstance(rt, str):
                        parsed_dt = date_parser.parse(rt)
                    else:
                        parsed_dt = rt
                    parsed_result_times.append(parsed_dt.strftime('%Y.%m.%d %H:%M'))
                except Exception:
                    parsed_result_times.append('-')

            combined.append({
                "patient_id": pid,
                "patient_name": entry["patient_name"],
                "doctor_id": entry["doctor_id"],
                "doctor_name": entry["doctor_name"],
                "request_type": entry["request_type"],
                "request_detail": entry["request_detail"],
                "result_detail": result_details if result_details else ['-'],
                "time": [entry["request_time"]] + parsed_result_times if result_time else [entry["request_time"], '-']
            })

        return Response(combined, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
