# backend/main_page_function/apps.py

from django.apps import AppConfig

class MainPageFunctionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main_page_function'
    verbose_name = '메인 페이지 기능'


# backend/main_page_function/migrations/0001_initial.py (마이그레이션 파일)

from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):
    initial = True
    
    dependencies = []
    
    operations = [
        migrations.CreateModel(
            name='Notice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='제목')),
                ('content', models.TextField(verbose_name='내용')),
                ('notice_type', models.CharField(
                    choices=[('important', '중요'), ('update', '업데이트'), ('maintenance', '점검'), ('general', '일반')],
                    default='general', max_length=20, verbose_name='공지 유형'
                )),
                ('is_active', models.BooleanField(default=True, verbose_name='활성화')),
                ('is_pinned', models.BooleanField(default=False, verbose_name='상단 고정')),
                ('created_by', models.CharField(max_length=100, verbose_name='작성자')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='작성일')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='수정일')),
                ('start_date', models.DateTimeField(default=django.utils.timezone.now, verbose_name='시작일')),
                ('end_date', models.DateTimeField(blank=True, null=True, verbose_name='종료일')),
            ],
            options={
                'verbose_name': '공지사항',
                'verbose_name_plural': '공지사항',
                'ordering': ['-is_pinned', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DoctorStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doctor_id', models.CharField(max_length=100, verbose_name='의사 ID')),
                ('doctor_name', models.CharField(max_length=100, verbose_name='의사 이름')),
                ('department', models.CharField(max_length=100, verbose_name='진료과')),
                ('today_patients', models.IntegerField(default=0, verbose_name='오늘 진료 환자 수')),
                ('waiting_patients', models.IntegerField(default=0, verbose_name='대기 환자 수')),
                ('total_appointments', models.IntegerField(default=0, verbose_name='총 예약 수')),
                ('status', models.CharField(
                    choices=[('online', '온라인'), ('busy', '진료중'), ('break', '휴식'), ('offline', '오프라인')],
                    default='online', max_length=20, verbose_name='상태'
                )),
                ('last_updated', models.DateTimeField(auto_now=True, verbose_name='마지막 업데이트')),
            ],
            options={
                'verbose_name': '의사 통계',
                'verbose_name_plural': '의사 통계',
            },
        ),
        migrations.AlterUniqueTogether(
            name='doctorstats',
            unique_together={('doctor_id',)},
        ),
    ]