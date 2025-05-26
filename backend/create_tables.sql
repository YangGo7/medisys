CREATE TABLE IF NOT EXISTS person (
    person_id INT PRIMARY KEY AUTO_INCREMENT,
    gender VARCHAR(50),
    birthdate DATE,
    dead TINYINT(1),
    death_date DATE NULL,
    creator INT,
    date_created DATETIME,
    changed_by INT NULL,
    date_changed DATETIME NULL,
    voided TINYINT(1),
    voided_by INT NULL,
    date_voided DATETIME NULL,
    void_reason VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS person_name (
    person_name_id INT PRIMARY KEY AUTO_INCREMENT,
    person_id INT,
    preferred TINYINT(1),
    given_name VARCHAR(50),
    middle_name VARCHAR(50),
    family_name VARCHAR(50),
    creator INT,
    date_created DATETIME,
    voided TINYINT(1),
    voided_by INT NULL,
    date_voided DATETIME NULL,
    void_reason VARCHAR(255) NULL,
    changed_by INT NULL,
    date_changed DATETIME NULL,
    FOREIGN KEY (person_id) REFERENCES person(person_id)
);

CREATE TABLE IF NOT EXISTS patient (
    patient_id INT PRIMARY KEY,
    creator INT,
    date_created DATETIME,
    changed_by INT NULL,
    date_changed DATETIME NULL,
    voided TINYINT(1),
    voided_by INT NULL,
    date_voided DATETIME NULL,
    void_reason VARCHAR(255) NULL,
    FOREIGN KEY (patient_id) REFERENCES person(person_id)
); 