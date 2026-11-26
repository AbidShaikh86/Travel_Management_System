package com.project.backend.repository;

import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.TravelDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelRequestRepository extends JpaRepository<TravelDetail, Long> {
    List<TravelDetail> findByUser_Id(Long userId);
    List<TravelDetail> findAllByUser_Id(Long userId);

    @Query("SELECT t FROM TravelDetail t LEFT JOIN FETCH t.approvalFlow WHERE t.status <> :status ORDER BY t.createdAt DESC")
    List<TravelDetail> findAllWithApprovalFlowByStatusNot(@Param("status") Status status);
}
