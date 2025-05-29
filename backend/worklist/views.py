# backend/worklist/views.py - import 수정 및 기존 뷰 확장

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from django.shortcuts import get_object_or_404
from .models import StudyRequest, WorkflowEvent, DICOMMapping
from .services import WorkflowService
from .serializers import StudyRequestSerializer

# 워크플로우 서비스 인스턴스
workflow_service = WorkflowService()

# 기존 StudyRequestViewSet 확장
class StudyRequestViewSet(viewsets.ModelViewSet):
    """기존 StudyRequest ViewSet 확장"""
    queryset = StudyRequest.objects.all()
    serializer_class = StudyRequestSerializer
    
    def create(self, request):
        """EMR에서 새 요청 생성"""
        try:
            # 워크플로우 서비스 사용
            study_request = workflow_service.create_emr_request(request.data)
            serializer = self.get_serializer(study_request)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'workflow_id': str(study_request.workflow_id),
                'message': 'Study request created successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['patch'])
    def update_workflow_status(self, request, pk=None):
        """워크플로우 상태 업데이트"""
        study_request = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes')
        
        try:
            if study_request.can_transition_to(new_status):
                study_request.update_workflow_status(new_status, notes)
                serializer = self.get_serializer(study_request)
                return Response({'success': True, 'data': serializer.data})
            else:
                return Response({
                    'success': False,
                    'error': f'Cannot transition from {study_request.workflow_status} to {new_status}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# 새로운 워크플로우 전용 API들
class WorkflowAPIView(APIView):
    """워크플로우 관리 API"""
    
    def post(self, request):
        """새 워크플로우 생성 (EMR에서 호출)"""
        try:
            study_request = workflow_service.create_emr_request(request.data)
            
            return Response({
                'success': True,
                'workflow_id': str(study_request.workflow_id),
                'accession_number': study_request.accession_number,
                'message': 'Workflow created successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class WorkflowDetailAPIView(APIView):
    """워크플로우 상세 관리 API"""
    
    def get(self, request, workflow_id):
        """워크플로우 상세 조회"""
        summary = workflow_service.get_workflow_summary(workflow_id)
        
        if summary:
            return Response({'success': True, 'data': summary})
        else:
            return Response({
                'success': False,
                'error': 'Workflow not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, workflow_id):
        """워크플로우 상태 업데이트"""
        action = request.data.get('action')
        
        try:
            if action == 'receive_at_ris':
                study_request = workflow_service.receive_at_ris(
                    workflow_id, 
                    request.data.get('received_by')
                )
            elif action == 'schedule_exam':
                study_request = workflow_service.schedule_exam(
                    workflow_id,
                    request.data.get('scheduled_datetime'),
                    request.data.get('notes')
                )
            elif action == 'start_exam':
                study_request = workflow_service.start_exam(
                    workflow_id,
                    request.data.get('technologist')
                )
            elif action == 'start_reading':
                study_request = workflow_service.start_reading(
                    workflow_id,
                    request.data.get('radiologist')
                )
            elif action == 'complete_reading':
                study_request = workflow_service.complete_reading(
                    workflow_id,
                    request.data.get('report_text'),
                    request.data.get('radiologist')
                )
            elif action == 'deliver_to_emr':
                study_request = workflow_service.deliver_to_emr(workflow_id)
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            summary = workflow_service.get_workflow_summary(workflow_id)
            return Response({
                'success': True,
                'data': summary,
                'message': f'Action {action} completed successfully'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_ris_worklist(request):
    """RIS용 워크리스트 API"""
    
    filters = {
        'modality': request.query_params.get('modality'),
        'status': request.query_params.get('status'),
        'priority': request.query_params.get('priority')
    }
    # None 값 제거
    filters = {k: v for k, v in filters.items() if v}
    
    worklist = workflow_service.get_worklist_for_ris(filters)
    
    return Response({
        'success': True,
        'data': worklist,
        'total': len(worklist)
    })


@api_view(['GET'])
def get_emr_completed_studies(request):
    """EMR용 완료된 검사 목록 API"""
    
    patient_id = request.query_params.get('patient_id')
    completed_studies = workflow_service.get_completed_studies_for_emr(patient_id)
    
    return Response({
        'success': True,
        'data': completed_studies,
        'total': len(completed_studies)
    })


@api_view(['POST'])
def upload_dicom_files(request, workflow_id):
    """DICOM 파일 업로드 API"""
    
    try:
        # 실제로는 여기서 Orthanc 업로드 처리
        # 지금은 시뮬레이션 데이터
        dicom_mappings = request.data.get('dicom_mappings', [])
        
        study_request = workflow_service.upload_dicom_images(workflow_id, dicom_mappings)
        
        return Response({
            'success': True,
            'workflow_id': str(study_request.workflow_id),
            'message': f'Uploaded {len(dicom_mappings)} DICOM files'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_workflow_events(request, workflow_id):
    """워크플로우 이벤트 로그 조회"""
    try:
        study_request = StudyRequest.objects.get(workflow_id=workflow_id)
        events = WorkflowEvent.objects.filter(study_request=study_request)
        
        event_data = [
            {
                'event_type': event.event_type,
                'from_status': event.from_status,
                'to_status': event.to_status,
                'notes': event.notes,
                'created_by': event.created_by,
                'created_at': event.created_at.isoformat()
            }
            for event in events
        ]
        
        return Response({
            'success': True,
            'data': event_data,
            'total': len(event_data)
        })
        
    except StudyRequest.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Workflow not found'
        }, status=status.HTTP_404_NOT_FOUND)