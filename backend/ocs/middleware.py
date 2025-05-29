# ocs/middleware.py

import json
from .models import OCSLog

class APILoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'POST' and request.path.startswith('/ocs/api/order'):
            request._body_copy = request.body

        response = self.get_response(request)

        if request.method == 'POST' and hasattr(request, '_body_copy'):
            try:
                parsed_body = json.loads(request._body_copy.decode('utf-8'))
            except Exception:
                parsed_body = {}

            OCSLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                patient_id=parsed_body.get('patient_id', 'UNKNOWN'),
                method=request.method,
                path=request.path,
                action=f"{request.method} 요청",
                detail=json.dumps(parsed_body)[:500]
            )

        return response
