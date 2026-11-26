package com.project.backend.repository;

import com.project.backend.model.TravelPolicyFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelPolicyFlagRepository extends JpaRepository<TravelPolicyFlag, Long> {
    List<TravelPolicyFlag> findByTravelDetail_Id(Long travelDetailId);
    List<TravelPolicyFlag> findByTravelDetail_IdIn(List<Long> travelDetailIds);
}
