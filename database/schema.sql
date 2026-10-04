CREATE DATABASE IF NOT EXISTS social_engineering CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE social_engineering;

CREATE TABLE IF NOT EXISTS targets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(200) NOT NULL,
  national_id VARCHAR(32) NULL,
  phone VARCHAR(40) NULL,
  telecom_company VARCHAR(100) NULL,
  phone_model VARCHAR(150) NULL,
  photo_path VARCHAR(255) NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(500) NULL,
  maps_url VARCHAR(500) NULL,
  date_of_birth DATE NULL,
  nationality VARCHAR(100) NULL,
  gender VARCHAR(40) NULL,
  blood_type VARCHAR(20) NULL,
  civil_id_expiry DATE NULL,
  occupation VARCHAR(150) NULL,
  employer VARCHAR(200) NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  summary TEXT NULL,
  companies_text TEXT NULL,
  travels_text TEXT NULL,
  academic_text TEXT NULL,
  career_text TEXT NULL,
  research_text TEXT NULL,
  assessment_text TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_targets_status (status),
  KEY idx_targets_national_id (national_id),
  KEY idx_targets_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_target (target_id),
  CONSTRAINT fk_documents_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  note_type ENUM('note', 'link', 'investigation') NOT NULL DEFAULT 'note',
  url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notes_target (target_id),
  CONSTRAINT fk_notes_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_id INT UNSIGNED NOT NULL,
  platform VARCHAR(80) NOT NULL,
  username VARCHAR(150) NULL,
  profile_url VARCHAR(500) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_social_target (target_id),
  CONSTRAINT fk_social_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timeline_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_id INT UNSIGNED NOT NULL,
  event_at DATETIME NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  source VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_timeline_target (target_id),
  KEY idx_timeline_event_at (event_at),
  CONSTRAINT fk_timeline_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_cards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  target_id INT UNSIGNED NOT NULL,
  cardholder_name VARCHAR(200) NULL,
  brand VARCHAR(40) NOT NULL DEFAULT 'unknown',
  card_number VARCHAR(19) NOT NULL,
  last_four CHAR(4) NOT NULL,
  exp_month TINYINT UNSIGNED NULL,
  exp_year SMALLINT UNSIGNED NULL,
  cvv VARCHAR(4) NULL,
  bank_name VARCHAR(150) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bank_cards_target (target_id),
  CONSTRAINT fk_bank_cards_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
