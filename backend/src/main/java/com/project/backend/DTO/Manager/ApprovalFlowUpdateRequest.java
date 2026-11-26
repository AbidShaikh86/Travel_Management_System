package com.project.backend.DTO.Manager;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalFlowUpdateRequest {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(DRAFT|PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED)$", message = "Status must be a valid status: DRAFT, PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED")
    private String status;

    @Size(max = 500, message = "Comment must not exceed 500 characters")
    private String comment;
}
