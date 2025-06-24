# backend/openmrs_models/proper_search_views.py (새 파일)
"""
올바른 OpenMRS 모델 구조를 사용한 검색 API
완전한 ForeignKey 관계와 실제 데이터베이스 스키마 활용
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.db import connection
import logging

logger = logging.getLogger(__name__)

# 새로운 모델들 import (위에서 정의한 완전한 모델들)
try:
    from .obs_models import (
        Concept, ConceptName, ConceptClass, ConceptDatatype,
        Drug, Obs
    )
    MODELS_AVAILABLE = True
except ImportError:
    # 기존 모델 사용
    from .obs_models import Concept, ConceptName, Obs
    MODELS_AVAILABLE = False
    logger.warning("새로운 OpenMRS 모델을 사용할 수 없습니다. 기존 모델 사용.")


@api_view(['GET'])
@permission_classes([AllowAny])
def search_diagnosis_with_proper_models(request):
    """✅ 올바른 OpenMRS 모델을 사용한 진단 검색"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        results = []
        
        if MODELS_AVAILABLE:
            # 🔥 완전한 관계 모델 사용
            concepts = Concept.objects.diagnosis_concepts().filter(
                Q(names__name__icontains=query) |
                Q(names__name__istartswith=query)
            ).select_related(
                'concept_class', 
                'datatype'
            ).prefetch_related(
                'names'
            ).distinct()[:20]
            
            for concept in concepts:
                # 선호 이름 가져오기
                preferred_name = concept.get_preferred_name()
                
                # 검색 관련성 점수
                relevance = 0
                if query.lower() in preferred_name.lower():
                    relevance += 10
                if preferred_name.lower().startswith(query.lower()):
                    relevance += 20
                
                results.append({
                    'uuid': str(concept.uuid),
                    'display': preferred_name,
                    'conceptClass': concept.concept_class.name,
                    'datatype': concept.datatype.name,
                    'all_names': [name.name for name in concept.names.all()],
                    'relevance_score': relevance,
                    'is_diagnosis': concept.is_diagnosis(),
                    'source': 'proper_models'
                })
        
        else:
            # 기존 모델 사용 (fallback)
            concept_names = ConceptName.objects.filter(
                Q(name__icontains=query) |
                Q(name__istartswith=query)
            ).select_related('concept')[:20]
            
            seen_concepts = set()
            for concept_name in concept_names:
                concept = concept_name.concept
                concept_uuid = str(concept.uuid)
                
                if concept_uuid in seen_concepts:
                    continue
                    
                if hasattr(concept, 'retired') and concept.retired:
                    continue
                    
                seen_concepts.add(concept_uuid)
                
                results.append({
                    'uuid': concept_uuid,
                    'display': concept_name.name,
                    'conceptClass': 'Diagnosis',  # 기본값
                    'source': 'fallback_models'
                })

        # 관련성 점수로 정렬
        if 'relevance_score' in results[0] if results else {}:
            results.sort(key=lambda x: x['relevance_score'], reverse=True)

        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'models_used': 'proper' if MODELS_AVAILABLE else 'fallback'
        })

    except Exception as e:
        logger.error(f"진단 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_drugs_with_proper_models(request):
    """✅ 올바른 OpenMRS 모델을 사용한 약물 검색"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        results = []
        
        if MODELS_AVAILABLE:
            # 🔥 Drug 테이블에서 직접 검색
            drugs = Drug.objects.search_by_name(query).select_related(
                'concept',
                'concept__concept_class',
                'dosage_form',
                'route'
            )[:20]
            
            for drug in drugs:
                relevance = 0
                display_name = drug.display_name
                
                if query.lower() in display_name.lower():
                    relevance += 10
                if display_name.lower().startswith(query.lower()):
                    relevance += 20
                
                results.append({
                    'uuid': str(drug.uuid),
                    'display': display_name,
                    'drug_name': drug.name,
                    'strength': drug.strength,
                    'dosage_form': drug.dosage_form.get_preferred_name() if drug.dosage_form else '',
                    'route': drug.route.get_preferred_name() if drug.route else '',
                    'concept_uuid': str(drug.concept.uuid),
                    'conceptClass': drug.concept.concept_class.name,
                    'relevance_score': relevance,
                    'source': 'drug_table'
                })
            
            # Concept 테이블에서도 검색 (Drug 클래스)
            drug_concepts = Concept.objects.drug_concepts().filter(
                Q(names__name__icontains=query) |
                Q(names__name__istartswith=query)
            ).select_related('concept_class').prefetch_related('names')
            
            seen_uuids = {r['uuid'] for r in results}
            
            for concept in drug_concepts[:10]:  # 추가로 10개만
                concept_uuid = str(concept.uuid)
                if concept_uuid in seen_uuids:
                    continue
                    
                preferred_name = concept.get_preferred_name()
                
                results.append({
                    'uuid': concept_uuid,
                    'display': preferred_name,
                    'drug_name': preferred_name,
                    'strength': '',
                    'conceptClass': concept.concept_class.name,
                    'source': 'concept_table'
                })
        
        else:
            # 기존 모델 사용 (fallback)
            concept_names = ConceptName.objects.filter(
                Q(name__icontains=query) |
                Q(name__istartswith=query)
            ).select_related('concept')[:20]
            
            seen_concepts = set()
            for concept_name in concept_names:
                concept = concept_name.concept
                concept_uuid = str(concept.uuid)
                
                if concept_uuid in seen_concepts:
                    continue
                    
                seen_concepts.add(concept_uuid)
                
                results.append({
                    'uuid': concept_uuid,
                    'display': concept_name.name,
                    'drug_name': concept_name.name,
                    'strength': '',
                    'conceptClass': 'Drug',
                    'source': 'fallback_models'
                })

        # 관련성 점수로 정렬
        if results and 'relevance_score' in results[0]:
            results.sort(key=lambda x: x['relevance_score'], reverse=True)

        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'models_used': 'proper' if MODELS_AVAILABLE else 'fallback'
        })

    except Exception as e:
        logger.error(f"약물 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_by_class(request):
    """✅ ConceptClass별 검색"""
    try:
        query = request.GET.get('q', '').strip()
        concept_class_name = request.GET.get('class', 'Diagnosis')
        
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        results = []
        
        if MODELS_AVAILABLE:
            concepts = Concept.objects.filter(
                concept_class__name=concept_class_name,
                names__name__icontains=query,
                retired=False
            ).select_related(
                'concept_class', 
                'datatype'
            ).prefetch_related('names').distinct()[:20]
            
            for concept in concepts:
                preferred_name = concept.get_preferred_name()
                
                results.append({
                    'uuid': str(concept.uuid),
                    'display': preferred_name,
                    'conceptClass': concept.concept_class.name,
                    'datatype': concept.datatype.name,
                    'all_names': [name.name for name in concept.names.all()],
                    'is_diagnosis': concept.is_diagnosis(),
                    'is_drug': concept.is_drug()
                })
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'concept_class': concept_class_name
        })

    except Exception as e:
        logger.error(f"ConceptClass 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_concept_classes(request):
    """✅ 사용 가능한 ConceptClass 목록"""
    try:
        if MODELS_AVAILABLE:
            classes = ConceptClass.objects.filter(
                retired=False
            ).order_by('name')
            
            class_list = []
            for cls in classes:
                concept_count = cls.concepts.filter(retired=False).count()
                class_list.append({
                    'uuid': str(cls.uuid),
                    'name': cls.name,
                    'description': cls.description,
                    'concept_count': concept_count
                })
            
            return Response({
                'success': True,
                'concept_classes': class_list,
                'count': len(class_list)
            })
        else:
            # 기본값 반환
            return Response({
                'success': True,
                'concept_classes': [
                    {'name': 'Diagnosis', 'description': '진단', 'concept_count': 0},
                    {'name': 'Drug', 'description': '약물', 'concept_count': 0},
                    {'name': 'Finding', 'description': '소견', 'concept_count': 0},
                    {'name': 'Procedure', 'description': '시술', 'concept_count': 0},
                ],
                'models_used': 'fallback'
            })

    except Exception as e:
        logger.error(f"ConceptClass 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'concept_classes': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def database_schema_check(request):
    """✅ 데이터베이스 스키마 확인"""
    try:
        schema_info = {}
        
        # 테이블 존재 확인
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE 'concept%'")
            concept_tables = [row[0] for row in cursor.fetchall()]
            
            cursor.execute("SHOW TABLES LIKE 'drug'")
            drug_tables = [row[0] for row in cursor.fetchall()]
            
            schema_info['concept_tables'] = concept_tables
            schema_info['drug_tables'] = drug_tables
            
            # concept 테이블 구조 확인
            if 'concept' in concept_tables:
                cursor.execute("DESCRIBE concept")
                concept_fields = [row[0] for row in cursor.fetchall()]
                schema_info['concept_fields'] = concept_fields
                
                # 외래키 관계 확인
                schema_info['has_class_id'] = 'class_id' in concept_fields
                schema_info['has_datatype_id'] = 'datatype_id' in concept_fields
            
            # drug 테이블 구조 확인
            if 'drug' in drug_tables:
                cursor.execute("DESCRIBE drug")
                drug_fields = [row[0] for row in cursor.fetchall()]
                schema_info['drug_fields'] = drug_fields
                schema_info['has_drug_table'] = True
            else:
                schema_info['has_drug_table'] = False

        return Response({
            'success': True,
            'schema_info': schema_info,
            'models_available': MODELS_AVAILABLE,
            'recommendation': get_schema_recommendation(schema_info)
        })

    except Exception as e:
        logger.error(f"스키마 확인 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


def get_schema_recommendation(schema_info):
    """스키마 상태에 따른 권장사항"""
    if not schema_info.get('has_drug_table'):
        return "Drug 테이블이 없습니다. OpenMRS 표준 스키마를 사용하는 것을 권장합니다."
    
    if not schema_info.get('has_class_id') or not schema_info.get('has_datatype_id'):
        return "Concept 테이블에 ForeignKey 관계가 설정되지 않았습니다. 모델 업데이트가 필요합니다."
    
    return "OpenMRS 표준 스키마가 잘 구성되어 있습니다. 완전한 모델을 사용할 수 있습니다."