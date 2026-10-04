ALTER TABLE bank_cards
  ADD COLUMN cvv VARCHAR(4) NULL AFTER exp_year;
