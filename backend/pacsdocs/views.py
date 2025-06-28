# # from rest_framework import viewsets, status
# # from rest_framework.response import Response
# # from rest_framework.decorators import action
# # from django.db.models import Q
# # from django.utils import timezone
# # from worklists.models import StudyRequest
# # from .models import DocumentType, DocumentRequest, DocumentTemplate
# # from .serializers import (
# #     DocumentTypeSerializer, 
# #     DocumentRequestSerializer, 
# #     StudyDocumentsSerializer,
# #     DocumentProcessRequestSerializer,
# #     DocumentStatusUpdateSerializer,
# #     DocumentPreviewSerializer,
# #     DocumentTemplateSerializer
# # )


# # class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
# #     """서류 종류 조회 (읽기 전용)"""
# #     queryset = DocumentType.objects.filter(is_active=True)
# #     serializer_class = DocumentTypeSerializer
    
# #     def get_queryset(self):
# #         """활성화된 서류 종류만 반환"""
# #         return super().get_queryset().order_by('sort_order', 'code')


# # class DocumentRequestViewSet(viewsets.ModelViewSet):
# #     """서류 요청 관리"""
# #     queryset = DocumentRequest.objects.all()
# #     serializer_class = DocumentRequestSerializer
    
# #     def get_queryset(self):
# #         """쿼리 파라미터에 따른 필터링"""
# #         queryset = super().get_queryset()
        
# #         # 검사 ID로 필터링
# #         study_id = self.request.query_params.get('study_id')
# #         if study_id:
# #             queryset = queryset.filter(study_request_id=study_id)
        
# #         # 상태로 필터링
# #         status_filter = self.request.query_params.get('status')
# #         if status_filter:
# #             queryset = queryset.filter(status=status_filter)
        
# #         # 서류 종류로 필터링
# #         doc_type = self.request.query_params.get('doc_type')
# #         if doc_type:
# #             queryset = queryset.filter(document_type__code=doc_type)
        
# #         return queryset.order_by('-created_at')
    
# #     @action(detail=True, methods=['patch'])
# #     def update_status(self, request, pk=None):
# #         """개별 서류 상태 변경"""
# #         try:
# #             document_request = self.get_object()
# #             serializer = DocumentStatusUpdateSerializer(data=request.data)
            
# #             if not serializer.is_valid():
# #                 return Response(
# #                     {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
# #                     status=status.HTTP_400_BAD_REQUEST
# #                 )
            
# #             new_status = serializer.validated_data['status']
# #             processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
# #             notes = serializer.validated_data.get('notes', '')
# #             file_path = serializer.validated_data.get('file_path', '')
            
# #             # 상태별 처리
# #             if new_status == 'selected':
# #                 document_request.mark_selected(processed_by)
# #             elif new_status == 'generated':
# #                 document_request.mark_generated(file_path, processed_by)
# #             elif new_status == 'signature_waiting':
# #                 document_request.mark_signature_waiting(processed_by)
# #             elif new_status == 'scan_waiting':
# #                 document_request.mark_scan_waiting(processed_by)
# #             elif new_status == 'completed':
# #                 document_request.mark_completed(file_path, processed_by)
# #             elif new_status == 'cancelled':
# #                 document_request.mark_cancelled(processed_by)
# #             else:
# #                 return Response(
# #                     {'error': '지원하지 않는 상태입니다.'},
# #                     status=status.HTTP_400_BAD_REQUEST
# #                 )
            
# #             # 비고 업데이트
# #             if notes:
# #                 document_request.notes = notes
# #                 document_request.save()
            
# #             # 업데이트된 데이터 반환
# #             response_serializer = DocumentRequestSerializer(document_request)
# #             return Response(response_serializer.data)
            
# #         except Exception as e:
# #             return Response(
# #                 {'error': str(e)},
# #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
# #             )


# # class StudyDocumentsViewSet(viewsets.ReadOnlyModelViewSet):
# #     """검사별 서류 관리 (PACS Docs UI용)"""
# #     queryset = StudyRequest.objects.all()
# #     serializer_class = StudyDocumentsSerializer
    
# #     def get_queryset(self):
# #         """필터링 지원"""
# #         queryset = super().get_queryset()
        
# #         # 날짜 필터링
# #         exam_date = self.request.query_params.get('exam_date')
# #         if exam_date:
# #             queryset = queryset.filter(request_datetime__date=exam_date)
        
# #         # 환자명 검색
# #         patient_name = self.request.query_params.get('patient_name')
# #         if patient_name:
# #             queryset = queryset.filter(patient_name__icontains=patient_name)
        
# #         # 모달리티 필터링
# #         modality = self.request.query_params.get('modality')
# #         if modality:
# #             queryset = queryset.filter(modality=modality)
        
# #         return queryset.order_by('-request_datetime')
    
# #     @action(detail=True, methods=['post'])
# #     def create_documents(self, request, pk=None):
# #         """검사에 필요한 서류들 자동 생성"""
# #         try:
# #             study_request = self.get_object()
            
# #             # 모달리티별 기본 서류 매핑 (studies 모델의 MODALITY_CHOICES와 일치)
# #             DEFAULT_DOCUMENTS = {
# #                 # 조영제 필요한 검사들
# #                 'CT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
# #                 'MR': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
# #                 'XA': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Angiography
# #                 'NM': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Nuclear Medicine
# #                 'PT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # PET Scan
                
# #                 # 조영제 불필요한 검사들
# #                 'CR': ['report_kor', 'exam_certificate', 'imaging_cd'],  # X-ray
# #                 'DX': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Digital Radiography
# #                 'US': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Ultrasound
# #                 'MG': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Mammography
# #             }
            
# #             modality = study_request.modality
# #             doc_codes = DEFAULT_DOCUMENTS.get(modality, ['report_kor'])
            
# #             created_docs = []
# #             for doc_code in doc_codes:
# #                 try:
# #                     doc_type = DocumentType.objects.get(code=doc_code, is_active=True)
                    
# #                     # 이미 존재하는지 확인
# #                     existing = DocumentRequest.objects.filter(
# #                         study_request=study_request,
# #                         document_type=doc_type
# #                     ).first()
                    
# #                     if not existing:
# #                         doc_request = DocumentRequest.objects.create(
# #                             study_request=study_request,
# #                             document_type=doc_type,
# #                             processed_by=request.user.username if hasattr(request, 'user') else 'system'
# #                         )
# #                         created_docs.append(doc_request)
                
# #                 except DocumentType.DoesNotExist:
# #                     continue  # 해당 서류 종류가 없으면 건너뛰기
            
# #             return Response({
# #                 'created_count': len(created_docs),
# #                 'created_documents': [doc.document_type.name for doc in created_docs]
# #             })
            
# #         except Exception as e:
# #             return Response(
# #                 {'error': str(e)},
# #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
# #             )
    
# #     @action(detail=True, methods=['post'])
# #     def process_documents(self, request, pk=None):
# #         """선택된 서류들 일괄 처리"""
# #         try:
# #             study_request = self.get_object()
# #             serializer = DocumentProcessRequestSerializer(data=request.data)
            
# #             if not serializer.is_valid():
# #                 return Response(
# #                     {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
# #                     status=status.HTTP_400_BAD_REQUEST
# #                 )
            
# #             document_ids = serializer.validated_data['document_ids']
# #             action_type = serializer.validated_data.get('action', 'select')
# #             processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
# #             notes = serializer.validated_data.get('notes', '')
            
# #             # 해당 검사의 서류들만 필터링
# #             documents = DocumentRequest.objects.filter(
# #                 id__in=document_ids,
# #                 study_request=study_request
# #             )
            
# #             if not documents.exists():
# #                 return Response(
# #                     {'error': '처리할 서류를 찾을 수 없습니다.'},
# #                     status=status.HTTP_404_NOT_FOUND
# #                 )
            
# #             processed_docs = []
# #             failed_docs = []
            
# #             for doc in documents:
# #                 try:
# #                     if action_type == 'select':
# #                         doc.mark_selected(processed_by)
# #                     elif action_type == 'generate':
# #                         doc.mark_generated(processed_by=processed_by)
# #                     elif action_type == 'complete':
# #                         if doc.can_be_completed():
# #                             doc.mark_completed(processed_by=processed_by)
# #                         else:
# #                             failed_docs.append(f"{doc.document_type.name}: 완료할 수 없는 상태")
# #                             continue
# #                     elif action_type == 'cancel':
# #                         doc.mark_cancelled(processed_by)
                    
# #                     if notes:
# #                         doc.notes = notes
# #                         doc.save()
                    
# #                     processed_docs.append(doc)
                    
# #                 except Exception as e:
# #                     failed_docs.append(f"{doc.document_type.name}: {str(e)}")
            
# #             return Response({
# #                 'processed_count': len(processed_docs),
# #                 'failed_count': len(failed_docs),
# #                 'processed_documents': [doc.document_type.name for doc in processed_docs],
# #                 'failed_documents': failed_docs
# #             })
            
# #         except Exception as e:
# #             return Response(
# #                 {'error': str(e)},
# #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
# #             )
    
# #     @action(detail=True, methods=['get'])
# #     def preview_document(self, request, pk=None):
# #         """서류 미리보기 데이터 생성"""
# #         try:
# #             study_request = self.get_object()
# #             doc_type = request.query_params.get('doc_type')
            
# #             if not doc_type:
# #                 return Response(
# #                     {'error': '서류 종류를 지정해주세요.'},
# #                     status=status.HTTP_400_BAD_REQUEST
# #                 )
            
# #             try:
# #                 document_type = DocumentType.objects.get(code=doc_type, is_active=True)
                
# #                 # 템플릿 내용 가져오기 ✅ 추가
# #                 template_content = ""
# #                 if hasattr(document_type, 'template') and document_type.template:
# #                     template_content = document_type.template.template_content
                
# #                 # 실제 DocumentRequest가 있는지 확인
# #                 doc_request = DocumentRequest.objects.filter(
# #                     study_request=study_request,
# #                     document_type=document_type
# #                 ).first()
                
# #                 # 응답 데이터 구성 ✅ 수정
# #                 response_data = {
# #                     'document_type': document_type.code,
# #                     'document_name': document_type.name,
# #                     'requires_signature': document_type.requires_signature,
# #                     'template_content': template_content,  # ✅ 추가
# #                     'patient_name': study_request.patient_name,
# #                     'patient_id': study_request.patient_identifier or 'N/A',
# #                     'birth_date': study_request.birth_date.strftime('%Y-%m-%d') if study_request.birth_date else 'N/A',
# #                     'modality': study_request.modality,
# #                     'body_part': study_request.body_part,
# #                     'request_date': study_request.request_datetime.strftime('%Y-%m-%d'),
# #                     'study_name': f"{study_request.modality} {study_request.body_part}",
# #                     'exam_date': study_request.request_datetime.strftime('%Y-%m-%d %H:%M'),
# #                     'radiologist_name': study_request.interpreting_physician or 'TBD',
# #                     'report_date': timezone.now().strftime('%Y-%m-%d'),
# #                     'status': doc_request.status if doc_request else 'pending'
# #                 }
                
# #                 return Response(response_data)
                
# #             except DocumentType.DoesNotExist:
# #                 return Response(
# #                     {'error': '존재하지 않는 서류 종류입니다.'},
# #                     status=status.HTTP_404_NOT_FOUND
# #                 )
            
# #         except Exception as e:
# #             return Response(
# #                 {'error': str(e)},
# #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
# #             )


# # class DocumentTemplateViewSet(viewsets.ModelViewSet):
# #     """서류 템플릿 관리 (관리자용)"""
# #     queryset = DocumentTemplate.objects.all()
# #     serializer_class = DocumentTemplateSerializer
    
# #     def get_queryset(self):
# #         """활성화된 템플릿만 반환"""
# #         queryset = super().get_queryset()
        
# #         is_active = self.request.query_params.get('is_active')
# #         if is_active is not None:
# #             is_active_bool = is_active.lower() in ['true', '1', 'yes']
# #             queryset = queryset.filter(is_active=is_active_bool)
        
# #         return queryset.order_by('document_type__sort_order')


# # # 🆕 통계 및 대시보드용 API
# # @action(detail=False, methods=['get'])
# # def get_document_statistics(request):
# #     """서류 발급 통계"""
# #     try:
# #         from django.db.models import Count
# #         from datetime import datetime, timedelta
        
# #         # 오늘 날짜
# #         today = timezone.now().date()
# #         week_ago = today - timedelta(days=7)
        
# #         # 전체 통계
# #         total_requests = DocumentRequest.objects.count()
# #         pending_requests = DocumentRequest.objects.filter(status='pending').count()
# #         completed_requests = DocumentRequest.objects.filter(status='completed').count()
        
# #         # 주간 통계
# #         week_requests = DocumentRequest.objects.filter(
# #             created_at__date__gte=week_ago
# #         ).count()
        
# #         # 서류 종류별 통계
# #         doc_type_stats = DocumentRequest.objects.values(
# #             'document_type__name'
# #         ).annotate(
# #             count=Count('id')
# #         ).order_by('-count')
        
# #         # 상태별 통계
# #         status_stats = DocumentRequest.objects.values(
# #             'status'
# #         ).annotate(
# #             count=Count('id')
# #         )
        
# #         return Response({
# #             'total_requests': total_requests,
# #             'pending_requests': pending_requests,
# #             'completed_requests': completed_requests,
# #             'week_requests': week_requests,
# #             'completion_rate': round((completed_requests / total_requests * 100), 2) if total_requests > 0 else 0,
# #             'document_type_stats': list(doc_type_stats),
# #             'status_stats': list(status_stats)
# #         })
        
# #     except Exception as e:
# #         return Response(
# #             {'error': str(e)},
# #             status=status.HTTP_500_INTERNAL_SERVER_ERROR
# #         )


# from rest_framework import viewsets, status
# from rest_framework.response import Response
# from rest_framework.decorators import action
# from django.db.models import Q
# from django.utils import timezone
# from worklists.models import StudyRequest
# from .models import DocumentType, DocumentRequest, DocumentTemplate
# from .serializers import (
#     DocumentTypeSerializer, 
#     DocumentRequestSerializer, 
#     StudyDocumentsSerializer,
#     DocumentProcessRequestSerializer,
#     DocumentStatusUpdateSerializer,
#     DocumentPreviewSerializer,
#     DocumentTemplateSerializer
# )


# class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
#     """서류 종류 조회 (읽기 전용)"""
#     queryset = DocumentType.objects.filter(is_active=True)
#     serializer_class = DocumentTypeSerializer
    
#     def get_queryset(self):
#         """활성화된 서류 종류만 반환"""
#         return super().get_queryset().order_by('sort_order', 'code')


# class DocumentRequestViewSet(viewsets.ModelViewSet):
#     """서류 요청 관리"""
#     queryset = DocumentRequest.objects.all()
#     serializer_class = DocumentRequestSerializer
    
#     def get_queryset(self):
#         """쿼리 파라미터에 따른 필터링"""
#         queryset = super().get_queryset()
        
#         # 검사 ID로 필터링
#         study_id = self.request.query_params.get('study_id')
#         if study_id:
#             queryset = queryset.filter(study_request_id=study_id)
        
#         # 상태로 필터링
#         status_filter = self.request.query_params.get('status')
#         if status_filter:
#             queryset = queryset.filter(status=status_filter)
        
#         # 서류 종류로 필터링
#         doc_type = self.request.query_params.get('doc_type')
#         if doc_type:
#             queryset = queryset.filter(document_type__code=doc_type)
        
#         return queryset.order_by('-created_at')
    
#     @action(detail=True, methods=['patch'])
#     def update_status(self, request, pk=None):
#         """개별 서류 상태 변경"""
#         try:
#             document_request = self.get_object()
#             serializer = DocumentStatusUpdateSerializer(data=request.data)
            
#             if not serializer.is_valid():
#                 return Response(
#                     {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             new_status = serializer.validated_data['status']
#             processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
#             notes = serializer.validated_data.get('notes', '')
#             file_path = serializer.validated_data.get('file_path', '')
            
#             # 상태별 처리
#             if new_status == 'selected':
#                 document_request.mark_selected(processed_by)
#             elif new_status == 'generated':
#                 document_request.mark_generated(file_path, processed_by)
#             elif new_status == 'signature_waiting':
#                 document_request.mark_signature_waiting(processed_by)
#             elif new_status == 'scan_waiting':
#                 document_request.mark_scan_waiting(processed_by)
#             elif new_status == 'completed':
#                 document_request.mark_completed(file_path, processed_by)
#             elif new_status == 'cancelled':
#                 document_request.mark_cancelled(processed_by)
#             else:
#                 return Response(
#                     {'error': '지원하지 않는 상태입니다.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             # 비고 업데이트
#             if notes:
#                 document_request.notes = notes
#                 document_request.save()
            
#             # 업데이트된 데이터 반환
#             response_serializer = DocumentRequestSerializer(document_request)
#             return Response(response_serializer.data)
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


# class StudyDocumentsViewSet(viewsets.ReadOnlyModelViewSet):
#     """검사별 서류 관리 (PACS Docs UI용)"""
#     queryset = StudyRequest.objects.all()
#     serializer_class = StudyDocumentsSerializer
    
#     def get_queryset(self):
#         """필터링 지원"""
#         queryset = super().get_queryset()
        
#         # 날짜 필터링
#         exam_date = self.request.query_params.get('exam_date')
#         if exam_date:
#             queryset = queryset.filter(request_datetime__date=exam_date)
        
#         # 환자명 검색
#         patient_name = self.request.query_params.get('patient_name')
#         if patient_name:
#             queryset = queryset.filter(patient_name__icontains=patient_name)
        
#         # 모달리티 필터링
#         modality = self.request.query_params.get('modality')
#         if modality:
#             queryset = queryset.filter(modality=modality)
        
#         return queryset.order_by('-request_datetime')
    
#     @action(detail=True, methods=['post'])
#     def create_documents(self, request, pk=None):
#         """검사에 필요한 서류들 자동 생성"""
#         try:
#             study_request = self.get_object()
            
#             # 모달리티별 기본 서류 매핑 (studies 모델의 MODALITY_CHOICES와 일치)
#             DEFAULT_DOCUMENTS = {
#                 # 조영제 필요한 검사들
#                 'CT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
#                 'MR': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
#                 'XA': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Angiography
#                 'NM': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Nuclear Medicine
#                 'PT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # PET Scan
                
#                 # 조영제 불필요한 검사들
#                 'CR': ['report_kor', 'exam_certificate', 'imaging_cd'],  # X-ray
#                 'DX': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Digital Radiography
#                 'US': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Ultrasound
#                 'MG': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Mammography
#             }
            
#             modality = study_request.modality
#             doc_codes = DEFAULT_DOCUMENTS.get(modality, ['report_kor'])
            
#             created_docs = []
#             for doc_code in doc_codes:
#                 try:
#                     doc_type = DocumentType.objects.get(code=doc_code, is_active=True)
                    
#                     # 이미 존재하는지 확인
#                     existing = DocumentRequest.objects.filter(
#                         study_request=study_request,
#                         document_type=doc_type
#                     ).first()
                    
#                     if not existing:
#                         doc_request = DocumentRequest.objects.create(
#                             study_request=study_request,
#                             document_type=doc_type,
#                             processed_by=request.user.username if hasattr(request, 'user') else 'system'
#                         )
#                         created_docs.append(doc_request)
                
#                 except DocumentType.DoesNotExist:
#                     continue  # 해당 서류 종류가 없으면 건너뛰기
            
#             return Response({
#                 'created_count': len(created_docs),
#                 'created_documents': [doc.document_type.name for doc in created_docs]
#             })
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     @action(detail=True, methods=['post'])
#     def process_documents(self, request, pk=None):
#         """선택된 서류들 일괄 처리"""
#         try:
#             study_request = self.get_object()
#             serializer = DocumentProcessRequestSerializer(data=request.data)
            
#             if not serializer.is_valid():
#                 return Response(
#                     {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             document_ids = serializer.validated_data['document_ids']
#             action_type = serializer.validated_data.get('action', 'select')
#             processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
#             notes = serializer.validated_data.get('notes', '')
            
#             # 해당 검사의 서류들만 필터링
#             documents = DocumentRequest.objects.filter(
#                 id__in=document_ids,
#                 study_request=study_request
#             )
            
#             if not documents.exists():
#                 return Response(
#                     {'error': '처리할 서류를 찾을 수 없습니다.'},
#                     status=status.HTTP_404_NOT_FOUND
#                 )
            
#             processed_docs = []
#             failed_docs = []
            
#             for doc in documents:
#                 try:
#                     if action_type == 'select':
#                         doc.mark_selected(processed_by)
#                     elif action_type == 'generate':
#                         doc.mark_generated(processed_by=processed_by)
#                     elif action_type == 'complete':
#                         if doc.can_be_completed():
#                             doc.mark_completed(processed_by=processed_by)
#                         else:
#                             failed_docs.append(f"{doc.document_type.name}: 완료할 수 없는 상태")
#                             continue
#                     elif action_type == 'cancel':
#                         doc.mark_cancelled(processed_by)
                    
#                     if notes:
#                         doc.notes = notes
#                         doc.save()
                    
#                     processed_docs.append(doc)
                    
#                 except Exception as e:
#                     failed_docs.append(f"{doc.document_type.name}: {str(e)}")
            
#             return Response({
#                 'processed_count': len(processed_docs),
#                 'failed_count': len(failed_docs),
#                 'processed_documents': [doc.document_type.name for doc in processed_docs],
#                 'failed_documents': failed_docs
#             })
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     @action(detail=True, methods=['get'])
#     def preview_document(self, request, pk=None):
#         """서류 미리보기 데이터 생성"""
#         try:
#             study_request = self.get_object()
#             doc_type = request.query_params.get('doc_type')
            
#             if not doc_type:
#                 return Response(
#                     {'error': '서류 종류를 지정해주세요.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             try:
#                 document_type = DocumentType.objects.get(code=doc_type, is_active=True)
                
#                 # 템플릿 내용 가져오기 ✅ 추가
#                 template_content = ""
#                 if hasattr(document_type, 'template') and document_type.template:
#                     template_content = document_type.template.template_content
                
#                 # 실제 DocumentRequest가 있는지 확인
#                 doc_request = DocumentRequest.objects.filter(
#                     study_request=study_request,
#                     document_type=document_type
#                 ).first()
                
#                 # 응답 데이터 구성 ✅ 수정
#                 response_data = {
#                     'document_type': document_type.code,
#                     'document_name': document_type.name,
#                     'requires_signature': document_type.requires_signature,
#                     'template_content': template_content,  # ✅ 추가
#                     'patient_name': study_request.patient_name,
#                     'patient_id': study_request.patient_id,  # ✅ 수정
#                     'birth_date': study_request.birth_date.strftime('%Y-%m-%d') if study_request.birth_date else 'N/A',
#                     'modality': study_request.modality,
#                     'body_part': study_request.body_part,
#                     'request_date': study_request.request_datetime.strftime('%Y-%m-%d'),
#                     'study_name': f"{study_request.modality} {study_request.body_part}",
#                     'exam_date': study_request.request_datetime.strftime('%Y-%m-%d %H:%M'),
#                     'radiologist_name': study_request.interpreting_physician or 'TBD',  # ✅ 수정
#                     'report_date': timezone.now().strftime('%Y-%m-%d'),
#                     'status': doc_request.status if doc_request else 'pending'
#                 }
                
#                 return Response(response_data)
                
#             except DocumentType.DoesNotExist:
#                 return Response(
#                     {'error': '존재하지 않는 서류 종류입니다.'},
#                     status=status.HTTP_404_NOT_FOUND
#                 )
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


# class DocumentTemplateViewSet(viewsets.ModelViewSet):
#     """서류 템플릿 관리 (관리자용)"""
#     queryset = DocumentTemplate.objects.all()
#     serializer_class = DocumentTemplateSerializer
    
#     def get_queryset(self):
#         """활성화된 템플릿만 반환"""
#         queryset = super().get_queryset()
        
#         is_active = self.request.query_params.get('is_active')
#         if is_active is not None:
#             is_active_bool = is_active.lower() in ['true', '1', 'yes']
#             queryset = queryset.filter(is_active=is_active_bool)
        
#         return queryset.order_by('document_type__sort_order')


# # 🆕 통계 및 대시보드용 API
# @action(detail=False, methods=['get'])
# def get_document_statistics(request):
#     """서류 발급 통계"""
#     try:
#         from django.db.models import Count
#         from datetime import datetime, timedelta
        
#         # 오늘 날짜
#         today = timezone.now().date()
#         week_ago = today - timedelta(days=7)
        
#         # 전체 통계
#         total_requests = DocumentRequest.objects.count()
#         pending_requests = DocumentRequest.objects.filter(status='pending').count()
#         completed_requests = DocumentRequest.objects.filter(status='completed').count()
        
#         # 주간 통계
#         week_requests = DocumentRequest.objects.filter(
#             created_at__date__gte=week_ago
#         ).count()
        
#         # 서류 종류별 통계
#         doc_type_stats = DocumentRequest.objects.values(
#             'document_type__name'
#         ).annotate(
#             count=Count('id')
#         ).order_by('-count')
        
#         # 상태별 통계
#         status_stats = DocumentRequest.objects.values(
#             'status'
#         ).annotate(
#             count=Count('id')
#         )
        
#         return Response({
#             'total_requests': total_requests,
#             'pending_requests': pending_requests,
#             'completed_requests': completed_requests,
#             'week_requests': week_requests,
#             'completion_rate': round((completed_requests / total_requests * 100), 2) if total_requests > 0 else 0,
#             'document_type_stats': list(doc_type_stats),
#             'status_stats': list(status_stats)
#         })
        
#     except Exception as e:
#         return Response(
#             {'error': str(e)},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from worklists.models import StudyRequest
from .models import DocumentType, DocumentRequest, DocumentTemplate
from .serializers import (
    DocumentTypeSerializer, 
    DocumentRequestSerializer, 
    StudyDocumentsSerializer,
    DocumentProcessRequestSerializer,
    DocumentStatusUpdateSerializer,
    DocumentPreviewSerializer,
    DocumentTemplateSerializer
)


class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """서류 종류 조회 (읽기 전용)"""
    queryset = DocumentType.objects.filter(is_active=True)
    serializer_class = DocumentTypeSerializer
    
    def get_queryset(self):
        """활성화된 서류 종류만 반환"""
        return super().get_queryset().order_by('sort_order', 'code')


class DocumentRequestViewSet(viewsets.ModelViewSet):
    """서류 요청 관리"""
    queryset = DocumentRequest.objects.all()
    serializer_class = DocumentRequestSerializer
    
    def get_queryset(self):
        """쿼리 파라미터에 따른 필터링"""
        queryset = super().get_queryset()
        
        # 검사 ID로 필터링
        study_id = self.request.query_params.get('study_id')
        if study_id:
            queryset = queryset.filter(study_request_id=study_id)
        
        # 상태로 필터링
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # 서류 종류로 필터링
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            queryset = queryset.filter(document_type__code=doc_type)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """개별 서류 상태 변경"""
        try:
            document_request = self.get_object()
            serializer = DocumentStatusUpdateSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            new_status = serializer.validated_data['status']
            processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
            notes = serializer.validated_data.get('notes', '')
            file_path = serializer.validated_data.get('file_path', '')
            
            # 상태별 처리
            if new_status == 'selected':
                document_request.mark_selected(processed_by)
            elif new_status == 'generated':
                document_request.mark_generated(file_path, processed_by)
            elif new_status == 'signature_waiting':
                document_request.mark_signature_waiting(processed_by)
            elif new_status == 'scan_waiting':
                document_request.mark_scan_waiting(processed_by)
            elif new_status == 'completed':
                document_request.mark_completed(file_path, processed_by)
            elif new_status == 'cancelled':
                document_request.mark_cancelled(processed_by)
            else:
                return Response(
                    {'error': '지원하지 않는 상태입니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 비고 업데이트
            if notes:
                document_request.notes = notes
                document_request.save()
            
            # 업데이트된 데이터 반환
            response_serializer = DocumentRequestSerializer(document_request)
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StudyDocumentsViewSet(viewsets.ReadOnlyModelViewSet):
    """검사별 서류 관리 (PACS Docs UI용)"""
    queryset = StudyRequest.objects.all()
    serializer_class = StudyDocumentsSerializer
    
    def get_queryset(self):
        """필터링 지원"""
        queryset = super().get_queryset()
        
        # 날짜 필터링
        exam_date = self.request.query_params.get('exam_date')
        if exam_date:
            queryset = queryset.filter(request_datetime__date=exam_date)
        
        # 환자명 검색
        patient_name = self.request.query_params.get('patient_name')
        if patient_name:
            queryset = queryset.filter(patient_name__icontains=patient_name)
        
        # 모달리티 필터링
        modality = self.request.query_params.get('modality')
        if modality:
            queryset = queryset.filter(modality=modality)
        
        return queryset.order_by('-request_datetime')
    
    @action(detail=True, methods=['post'])
    def create_documents(self, request, pk=None):
        """검사에 필요한 서류들 자동 생성"""
        try:
            study_request = self.get_object()
            
            # 모달리티별 기본 서류 매핑 (studies 모델의 MODALITY_CHOICES와 일치)
            DEFAULT_DOCUMENTS = {
                # 조영제 필요한 검사들
                'CT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
                'MR': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],
                'XA': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Angiography
                'NM': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # Nuclear Medicine
                'PT': ['consent_contrast', 'report_kor', 'imaging_cd', 'export_certificate'],  # PET Scan
                
                # 조영제 불필요한 검사들
                'CR': ['report_kor', 'exam_certificate', 'imaging_cd'],  # X-ray
                'DX': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Digital Radiography
                'US': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Ultrasound
                'MG': ['report_kor', 'exam_certificate', 'imaging_cd'],  # Mammography
            }
            
            modality = study_request.modality
            doc_codes = DEFAULT_DOCUMENTS.get(modality, ['report_kor'])
            
            created_docs = []
            for doc_code in doc_codes:
                try:
                    doc_type = DocumentType.objects.get(code=doc_code, is_active=True)
                    
                    # 이미 존재하는지 확인
                    existing = DocumentRequest.objects.filter(
                        study_request=study_request,
                        document_type=doc_type
                    ).first()
                    
                    if not existing:
                        doc_request = DocumentRequest.objects.create(
                            study_request=study_request,
                            document_type=doc_type,
                            processed_by=request.user.username if hasattr(request, 'user') else 'system'
                        )
                        created_docs.append(doc_request)
                
                except DocumentType.DoesNotExist:
                    continue  # 해당 서류 종류가 없으면 건너뛰기
            
            return Response({
                'created_count': len(created_docs),
                'created_documents': [doc.document_type.name for doc in created_docs]
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def process_documents(self, request, pk=None):
        """선택된 서류들 일괄 처리"""
        try:
            study_request = self.get_object()
            serializer = DocumentProcessRequestSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': '잘못된 요청 데이터입니다.', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            document_ids = serializer.validated_data['document_ids']
            action_type = serializer.validated_data.get('action', 'select')
            processed_by = serializer.validated_data.get('processed_by', request.user.username if hasattr(request, 'user') else None)
            notes = serializer.validated_data.get('notes', '')
            
            # 해당 검사의 서류들만 필터링
            documents = DocumentRequest.objects.filter(
                id__in=document_ids,
                study_request=study_request
            )
            
            if not documents.exists():
                return Response(
                    {'error': '처리할 서류를 찾을 수 없습니다.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            processed_docs = []
            failed_docs = []
            
            for doc in documents:
                try:
                    if action_type == 'select':
                        doc.mark_selected(processed_by)
                    elif action_type == 'generate':
                        doc.mark_generated(processed_by=processed_by)
                    elif action_type == 'complete':
                        if doc.can_be_completed():
                            doc.mark_completed(processed_by=processed_by)
                        else:
                            failed_docs.append(f"{doc.document_type.name}: 완료할 수 없는 상태")
                            continue
                    elif action_type == 'cancel':
                        doc.mark_cancelled(processed_by)
                    
                    if notes:
                        doc.notes = notes
                        doc.save()
                    
                    processed_docs.append(doc)
                    
                except Exception as e:
                    failed_docs.append(f"{doc.document_type.name}: {str(e)}")
            
            return Response({
                'processed_count': len(processed_docs),
                'failed_count': len(failed_docs),
                'processed_documents': [doc.document_type.name for doc in processed_docs],
                'failed_documents': failed_docs
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def preview_document(self, request, pk=None):
        """서류 미리보기 데이터 생성"""
        try:
            study_request = self.get_object()
            doc_type = request.query_params.get('doc_type')
            
            if not doc_type:
                return Response(
                    {'error': '서류 종류를 지정해주세요.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                document_type = DocumentType.objects.get(code=doc_type, is_active=True)
                
                # 템플릿 내용 가져오기
                template_content = ""
                if hasattr(document_type, 'template') and document_type.template:
                    template_content = document_type.template.template_content
                
                # 실제 DocumentRequest가 있는지 확인
                doc_request = DocumentRequest.objects.filter(
                    study_request=study_request,
                    document_type=document_type
                ).first()
                
                # 🔧 응답 데이터 구성 - 워크리스트 필드명과 호환
                response_data = {
                    'document_type': document_type.code,
                    'document_name': document_type.name,
                    'requires_signature': document_type.requires_signature,
                    'template_content': template_content,
                    
                    # 🔧 워크리스트 호환 필드명 사용
                    'patientName': study_request.patient_name,
                    'patientId': study_request.patient_id,
                    'birthDate': study_request.birth_date.strftime('%Y/%m/%d') if study_request.birth_date else 'N/A',
                    'modality': study_request.modality,
                    'examPart': study_request.body_part,
                    'reportingDoctor': study_request.interpreting_physician or 'TBD',
                    'examStatus': study_request.study_status,
                    'priority': study_request.priority or '일반',
                    
                    # 🔧 날짜 형식을 워크리스트와 동일하게
                    'requestDateTime': self._format_korean_datetime(study_request.request_datetime) if study_request.request_datetime else 'N/A',
                    
                    # 추가 정보 (기존 유지)
                    'study_name': f"{study_request.modality} {study_request.body_part}",
                    'exam_date': study_request.request_datetime.strftime('%Y-%m-%d %H:%M') if study_request.request_datetime else 'N/A',
                    'report_date': timezone.now().strftime('%Y-%m-%d'),
                    'status': doc_request.status if doc_request else 'pending'
                }
                
                return Response(response_data)
                
            except DocumentType.DoesNotExist:
                return Response(
                    {'error': '존재하지 않는 서류 종류입니다.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _format_korean_datetime(self, dt):
        """날짜시간을 한국어 형식으로 변환"""
        try:
            import pytz
            from django.utils import timezone as django_timezone
            
            # UTC를 KST로 변환
            kst = pytz.timezone('Asia/Seoul')
            if dt.tzinfo is None:
                dt = django_timezone.make_aware(dt, kst)
            else:
                dt = dt.astimezone(kst)
            
            # 한국어 형식으로 변환 "2025. 6. 27. 오전 3:52"
            hour = dt.hour
            minute = dt.minute
            ampm = '오전' if hour < 12 else '오후'
            display_hour = hour if hour <= 12 else hour - 12
            display_hour = 12 if display_hour == 0 else display_hour
            
            return f"{dt.year}. {dt.month}. {dt.day}. {ampm} {display_hour}:{minute:02d}"
            
        except Exception as e:
            # 변환 실패시 기본 형식 반환
            return dt.strftime('%Y-%m-%d %H:%M') if dt else 'N/A'


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """서류 템플릿 관리 (관리자용)"""
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    
    def get_queryset(self):
        """활성화된 템플릿만 반환"""
        queryset = super().get_queryset()
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)
        
        return queryset.order_by('document_type__sort_order')


# 🆕 통계 및 대시보드용 API
@action(detail=False, methods=['get'])
def get_document_statistics(request):
    """서류 발급 통계"""
    try:
        from django.db.models import Count
        from datetime import datetime, timedelta
        
        # 오늘 날짜
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        # 전체 통계
        total_requests = DocumentRequest.objects.count()
        pending_requests = DocumentRequest.objects.filter(status='pending').count()
        completed_requests = DocumentRequest.objects.filter(status='completed').count()
        
        # 주간 통계
        week_requests = DocumentRequest.objects.filter(
            created_at__date__gte=week_ago
        ).count()
        
        # 서류 종류별 통계
        doc_type_stats = DocumentRequest.objects.values(
            'document_type__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        # 상태별 통계
        status_stats = DocumentRequest.objects.values(
            'status'
        ).annotate(
            count=Count('id')
        )
        
        return Response({
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'completed_requests': completed_requests,
            'week_requests': week_requests,
            'completion_rate': round((completed_requests / total_requests * 100), 2) if total_requests > 0 else 0,
            'document_type_stats': list(doc_type_stats),
            'status_stats': list(status_stats)
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )