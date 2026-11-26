CREATE DATABASE Travel_Management_System;

USE Travel_Management_System;

CREATE TABLE employee
(
	employee_id INT PRIMARY KEY,
    name VARCHAR(50),
    age INT,
    gender CHAR,
    email VARCHAR(100),
    designation VARCHAR(25),
    department_id INT REFERENCES department
);

CREATE TABLE department
(
	department_id INT PRIMARY KEY,
    department_name VARCHAR(50),
    manager_id INT REFERENCES employee
);

CREATE TABLE travel_detail
(
	travel_id INT PRIMARY KEY,
    purpose VARCHAR(50),
    destination VARCHAR(50),
    travel_date DATE,
    stay INT,
    estimated_budget DECIMAL(10,2),
    status VARCHAR(15),
    employee_id INT REFERENCES employee,
    approval_id INT REFERENCES approval_table
);

CREATE TABLE expense_detail
(
	expense_id INT PRIMARY KEY,
    type VARCHAR(30),
    amount DECIMAL(10,2),
    travel_id INT REFERENCES travel_detail
);

CREATE TABLE approval_table
(
	approval_id INT PRIMARY KEY,
    travel_id INT REFERENCES travel_detail,
    status VARCHAR(15),
    comments VARCHAR(255),
    manager_id INT REFERENCES employee
);

CREATE TABLE reimbursement
(
	reimbursement_id INT PRIMARY KEY,
    employee_id INT REFERENCES employee,
    amount DECIMAL(10,2),
    status VARCHAR(10),
    createdAt DATE
);