-- A stored empty read ('null') can be a call that failed rather than an answer, and routes/scan.js
-- keeps only answers; clearing these lets each one be read once more when its draft next opens.
UPDATE scan_uploads SET ai_read_json = NULL WHERE ai_read_json = 'null';
