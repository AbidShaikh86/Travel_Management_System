package com.project.backend.DTO.reimbursement;

import jakarta.validation.constraints.NotNull;
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
public class ReimbursementRequest {

    @NotNull(message = "User ID is required")
    @Positive(message = "User ID must be a positive number")
    private Long userId;

    @NotNull(message = "Travel ID is required")
    @Positive(message = "Travel ID must be a positive number")
    private Long travelId;

    @Size(max = 500, message = "Comment must not exceed 500 characters")
    private String comment;
}
