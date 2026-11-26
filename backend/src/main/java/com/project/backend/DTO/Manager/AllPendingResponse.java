package com.project.backend.DTO.Manager;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AllPendingResponse {
    private Long id;
    private String employeeName;
    private String employeeDesignation;
    private String departmentName;
    private String destination;
    private String purpose;
    private String travelClass;
    private String status;
    private Integer stay;
    private LocalDate travelStartDate;
    private Double estimatedBudget;
    private Boolean isFlagged;
    private LocalDateTime createdAt;
    private List<FlaggedPolicyResponse> flaggedPolicies;
}
