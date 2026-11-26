package com.project.backend.repository;

import com.project.backend.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByReimbursementId(Long reimbursementId);
    List<Expense> findAllByReimbursementId(Long reimbursementId);
}
