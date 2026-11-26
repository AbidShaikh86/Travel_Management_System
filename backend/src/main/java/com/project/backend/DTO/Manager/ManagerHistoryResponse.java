package com.project.backend.DTO.Manager;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ManagerHistoryResponse {
    private Long id;
    private Long travelId;
    private String employeeName;
    private String destination;
    private String purpose;
    private Double estimatedBudget;
    private String status;
    private String comment;
    private LocalDateTime actionDate;
}
