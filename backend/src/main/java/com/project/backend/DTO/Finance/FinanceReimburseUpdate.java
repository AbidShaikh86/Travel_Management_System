package com.project.backend.DTO.Finance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FinanceReimburseUpdate {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(DRAFT|PENDING|APPROVED|REJECTED|PAID)$", message = "Status must be a valid reimbursement status: DRAFT, PENDING, APPROVED, REJECTED, PAID")
    private String status;
}
