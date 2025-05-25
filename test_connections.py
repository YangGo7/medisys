#!/usr/bin/env python3
import mysql.connector
import psycopg2
import pymongo
import requests
from requests.auth import HTTPBasicAuth

def test_mariadb():
    print("=== MariaDB 연결 테스트 (포트 3306) ===")
    try:
        # MariaDB 컨테이너 로그에서 비밀번호 확인 필요
        connection = mysql.connector.connect(
            host=localhost,
            port=3306,
            user=root,
            password=password,  # 실제 비밀번호로 변경 필요
            charset=utf8mb4
        )
        cursor = connection.cursor()
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        print(f"✅ MariaDB 연결 성공! 데이터베이스 수: {len(databases)}")
        
        # medical_system 데이터베이스 생성
        cursor.execute("CREATE DATABASE IF NOT EXISTS medical_system")
        print("medical_system 데이터베이스 준비 완료")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ MariaDB 연결 실패: {e}")
        print("MariaDB 비밀번호를 확인하세요: docker logs mariadb-server")
        return False

def test_openmrs_mysql():
    print("\n=== OpenMRS MySQL 연결 테스트 (포트 3307) ===")
    try:
        connection = mysql.connector.connect(
EOF     print("⚠️ 연결 문제가 있습니다. 컨테이너 상태를 확인하세요.")unt}")= 0") EOF
