package com.project.backend.DTO.Finance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FinanceBudgetRequest {

    @NotNull(message = "Budget is required")
    @PositiveOrZero(message = "Budget must be greater than or equal to zero")
    private Double budget;

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(DRAFT|PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED)$", message = "Status must be a valid status: DRAFT, PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED")
    private String status;
}
