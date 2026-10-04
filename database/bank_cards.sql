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
