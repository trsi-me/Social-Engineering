ALTER TABLE targets
  ADD COLUMN telecom_company VARCHAR(100) NULL AFTER phone,
  ADD COLUMN phone_model VARCHAR(150) NULL AFTER telecom_company;
