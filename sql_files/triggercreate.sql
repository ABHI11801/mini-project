DELIMITER //
CREATE TRIGGER before_insert_page
BEFORE INSERT ON pages
FOR EACH ROW
BEGIN
    DECLARE max_index INT;
    
    SELECT COALESCE(MAX(pages_order_index), 0) INTO max_index
    FROM pages
    WHERE proj_id = NEW.proj_id;
    
    SET NEW.pages_order_index = max_index + 1;
END//
DELIMITER ;
