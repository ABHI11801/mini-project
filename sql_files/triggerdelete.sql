DELIMITER //
DROP TRIGGER IF EXISTS after_delete_page//
DELIMITER ;

DELIMITER //
CREATE TRIGGER after_delete_page
AFTER DELETE ON pages
FOR EACH ROW
BEGIN
    INSERT INTO page_reindex_queue (proj_id, deleted_index, process_time)
    VALUES (OLD.proj_id, OLD.pages_order_index, NOW());
END//
DELIMITER ;

CREATE TABLE IF NOT EXISTS page_reindex_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proj_id INT NOT NULL,
    deleted_index INT NOT NULL,
    process_time TIMESTAMP NOT NULL,
    processed BOOLEAN DEFAULT FALSE
);

DELIMITER //
CREATE PROCEDURE process_page_reindex_queue()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE queue_id INT;
    DECLARE project_id INT;
    DECLARE index_val INT;
    
    DECLARE cur CURSOR FOR 
        SELECT id, proj_id, deleted_index 
        FROM page_reindex_queue 
        WHERE processed = FALSE
        ORDER BY process_time;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO queue_id, project_id, index_val;
        IF done THEN
            LEAVE read_loop;
        END IF;
        

        UPDATE pages
        SET pages_order_index = pages_order_index - 1
        WHERE proj_id = project_id
          AND pages_order_index > index_val;
        UPDATE page_reindex_queue SET processed = TRUE WHERE id = queue_id;
    END LOOP;
    
    CLOSE cur;
END//
DELIMITER ;

DELIMITER //
CREATE EVENT IF NOT EXISTS process_page_reindex
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
    CALL process_page_reindex_queue();
END//
DELIMITER ;

SET GLOBAL event_scheduler = ON;


