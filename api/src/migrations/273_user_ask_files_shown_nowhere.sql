-- Rows of Ask files no chat and no list shows: deleted, or never made, with their chat removed. They hold no bytes.
DELETE FROM user_ask_files WHERE chat_id IS NULL AND stored_name IS NULL;
