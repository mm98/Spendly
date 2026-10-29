-- The Green scheme is removed (11a, K): an account that chose it has Emerald.
UPDATE user_settings SET colour_scheme = 'emerald' WHERE colour_scheme = 'green';
