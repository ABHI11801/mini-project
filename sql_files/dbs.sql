create database website_generation_data;
use website_generation_data;
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100),
    user_email VARCHAR(100) UNIQUE,
    user_password VARCHAR(100),
    user_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE projects (
    proj_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    proj_name VARCHAR(100),
    proj_status VARCHAR(50),
    proj_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);
CREATE TABLE pages (
    pages_id INT AUTO_INCREMENT PRIMARY KEY,
    proj_id INT ,
    pages_name VARCHAR(100),
    pages_description varchar(500),
    pages_order_index INT,
    pages_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proj_id) REFERENCES projects(proj_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);
CREATE TABLE logs (
	logs_id INT AUTO_INCREMENT PRIMARY KEY,
	proj_id INT ,
	logs_message varchar(500) ,
	log_type varchar(100) ,
	logs_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (proj_id) REFERENCES projects(proj_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);
 CREATE TABLE generated_apps (
	generated_apps_id INT AUTO_INCREMENT PRIMARY KEY,
	proj_id INT ,
	dowload_link varchar(300)  ,
	log_type varchar(100) ,
	generated_apps_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (proj_id) REFERENCES projects(proj_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);
 CREATE TABLE files (
	files_id INT AUTO_INCREMENT PRIMARY KEY,
	proj_id INT ,
	file_name varchar(100)  ,
	file_type varchar(50) ,
	file_uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (proj_id) REFERENCES projects(proj_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);
INSERT INTO users (user_name, user_email, user_password) VALUES
('Alice Johnson', 'alice@example.com', 'hashed_password_1');
select * from projects;
describe projects;