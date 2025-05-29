from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('worklist', '0001_initial'),
    ]

    operations = [
        # StudyRequest 모델에 워크플로우 필드 추가
        migrations.AddField(
            model_name='studyrequest',
            name='workflow_id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='workflow_status',
            field=models.CharField(
                choices=[
                    ('emr_requested', 'EMR 요청'),
                    ('ris_received', 'RIS 접수'),
                    ('scheduled', '검사 예약'),
                    ('in_progress', '검사 진행중'),
                    ('image_uploaded', '영상 업로드'),
                    ('ai_analyzing', 'AI 분석중'),
                    ('ai_completed', 'AI 분석완료'),
                    ('reading_pending', '판독 대기'),
                    ('reading_in_progress', '판독 진행중'),
                    ('reading_completed', '판독 완료'),
                    ('report_approved', '리포트 승인'),
                    ('emr_delivered', 'EMR 전송완료'),
                    ('workflow_completed', '워크플로우 완료'),
                    ('cancelled', '취소'),
                    ('error', '오류')
                ],
                default='emr_requested',
                max_length=30
            ),
        ),
        
        # 시간 추적 필드들
        migrations.AddField(
            model_name='studyrequest',
            name='emr_requested_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='ris_received_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='image_uploaded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='ai_analysis_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='ai_analysis_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='reading_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='reading_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='emr_delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # 추가 메타데이터 필드들
        migrations.AddField(
            model_name='studyrequest',
            name='study_description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='clinical_info',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='priority',
            field=models.CharField(
                choices=[('routine', 'Routine'), ('urgent', 'Urgent'), ('stat', 'STAT')],
                default='routine',
                max_length=10
            ),
        ),
        
        # AI 관련 필드들
        migrations.AddField(
            model_name='studyrequest',
            name='ai_analysis_result',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='ai_confidence_score',
            field=models.FloatField(blank=True, null=True),
        ),
        
        # 판독 관련 필드들
        migrations.AddField(
            model_name='studyrequest',
            name='report_text',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='report_created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # 오류 및 메모 필드들
        migrations.AddField(
            model_name='studyrequest',
            name='error_message',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studyrequest',
            name='workflow_notes',
            field=models.TextField(blank=True, null=True),
        ),
        
        # 인덱스 추가 - 기존 필드명 사용
        migrations.AddIndex(
            model_name='studyrequest',
            index=models.Index(fields=['workflow_status', 'request_datetime'], name='workflow_status_time_idx'),
        ),
        migrations.AddIndex(
            model_name='studyrequest',
            index=models.Index(fields=['patient_id', 'workflow_status'], name='patient_workflow_idx'),
        ),
        migrations.AddIndex(
            model_name='studyrequest',
            index=models.Index(fields=['modality', 'workflow_status'], name='modality_workflow_idx'),
        ),
        migrations.AddIndex(
            model_name='studyrequest',
            index=models.Index(fields=['requesting_physician'], name='requesting_physician_idx'),
        ),
        migrations.AddIndex(
            model_name='studyrequest',
            index=models.Index(fields=['workflow_id'], name='workflow_id_idx'),
        ),
        
        # WorkflowEvent 모델 생성
        migrations.CreateModel(
            name='WorkflowEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(max_length=30)),
                ('from_status', models.CharField(blank=True, max_length=30, null=True)),
                ('to_status', models.CharField(blank=True, max_length=30, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_by', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('study_request', models.ForeignKey(on_delete=models.CASCADE, related_name='workflow_events', to='worklist.studyrequest')),
            ],
            options={
                'db_table': 'workflow_event',
                'ordering': ['-created_at'],
            },
        ),
        
        # DICOMMapping 모델 생성
        migrations.CreateModel(
            name='DICOMMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orthanc_study_id', models.CharField(max_length=255)),
                ('orthanc_series_id', models.CharField(max_length=255)),
                ('orthanc_instance_id', models.CharField(max_length=255)),
                ('study_instance_uid', models.CharField(max_length=255)),
                ('series_instance_uid', models.CharField(max_length=255)),
                ('sop_instance_uid', models.CharField(max_length=255)),
                ('series_description', models.CharField(blank=True, max_length=255, null=True)),
                ('series_number', models.IntegerField(blank=True, null=True)),
                ('instance_number', models.IntegerField(blank=True, null=True)),
                ('file_size', models.BigIntegerField(blank=True, null=True)),
                ('image_type', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('study_request', models.ForeignKey(on_delete=models.CASCADE, related_name='dicom_mappings', to='worklist.studyrequest')),
            ],
            options={
                'db_table': 'dicom_mapping',
            },
        ),
        
        # DICOMMapping 유니크 제약조건
        migrations.AddConstraint(
            model_name='dicommapping',
            constraint=models.UniqueConstraint(fields=('study_request', 'orthanc_instance_id'), name='unique_study_instance_mapping'),
        ),
    ]
