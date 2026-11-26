package com.project.backend.DTO.Employee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TravelResponse {
    private Long id;
    private String destination;
    private String purpose;
    private String travelClass;
    private String status;
    private Integer stay;
    private LocalDate travelStartDate;
    private Double estimatedBudget;
    private Boolean isFlagged;
    private String managerApproval;
    private LocalDateTime createdAt;
}
