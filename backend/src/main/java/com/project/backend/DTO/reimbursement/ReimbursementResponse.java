package com.project.backend.DTO.reimbursement;

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
public class ReimbursementResponse {
    private Long id;
    private String employeeName;
    private String employeeEmail;
    private Long travelDetailId;
    private String travelDestination;
    private LocalDate travelStartDate;
    private String status;
    private String comment;
    private Double totalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
    private List<ExpenseResponse> expenses;
}
