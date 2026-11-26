package com.project.backend.repository;

import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Reimbursement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReimbursementRepository extends JpaRepository<Reimbursement, Long> {
    // Finance sees all submitted (non-DRAFT) reimbursements
    List<Reimbursement> findByStatusNot(ReimbursementStatus status);

    // Employee sees their own reimbursements
    List<Reimbursement> findByUserId(Long userId);

    boolean existsByTravelDetailId(Long id);
}
