package com.project.backend.repository;

import com.project.backend.model.ApprovalFlow;
import com.project.backend.model.Enumerator.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ApprovalRepository extends JpaRepository<ApprovalFlow, Long> {
    List<ApprovalFlow> findByManagerIdAndStatus(Long managerId, Status status);

    List<ApprovalFlow> findByManagerIdAndStatusInOrderByActionDateDesc(Long managerId, Collection<Status> statuses);
}
