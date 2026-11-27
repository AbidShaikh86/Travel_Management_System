package com.project.backend.repository;

import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByReimbursementId(Long reimbursementId);
    List<Expense> findAllByReimbursementId(Long reimbursementId);

    @Query("SELECT u.departmentId, COALESCE(SUM(e.amount), 0.0) " +
           "FROM Expense e " +
           "JOIN e.reimbursement r " +
           "JOIN r.user u " +
           "WHERE r.status = :status AND u.departmentId IS NOT NULL " +
           "GROUP BY u.departmentId")
    List<Object[]> sumAmountByDepartmentIdAndReimbursementStatus(@Param("status") ReimbursementStatus status);
}
