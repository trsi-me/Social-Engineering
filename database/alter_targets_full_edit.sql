ALTER TABLE targets
  ADD COLUMN english_name VARCHAR(200) NULL AFTER full_name,
  ADD COLUMN gender VARCHAR(40) NULL AFTER nationality,
  ADD COLUMN blood_type VARCHAR(20) NULL AFTER gender,
  ADD COLUMN civil_id_expiry DATE NULL AFTER blood_type,
  ADD COLUMN companies_text TEXT NULL AFTER summary,
  ADD COLUMN academic_text TEXT NULL AFTER companies_text,
  ADD COLUMN career_text TEXT NULL AFTER academic_text,
  ADD COLUMN research_text TEXT NULL AFTER career_text,
  ADD COLUMN assessment_text TEXT NULL AFTER research_text;
