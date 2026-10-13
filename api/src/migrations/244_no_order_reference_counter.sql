-- An order without a reference keeps none: nothing numbers it.
ALTER TABLE users DROP COLUMN order_reference_last;
