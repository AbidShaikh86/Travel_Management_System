package com.project.backend.DTO.Admin;

import com.project.backend.model.Enumerator.PolicyType;
import jakarta.validation.constraints.NotBlank;
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
public class AddPolicyRequest {

    @NotBlank(message = "Policy name is required")
    @Size(max = 100, message = "Policy name must not exceed 100 characters")
    private String name;

    @NotNull(message = "Policy type is required")
    private PolicyType type;

    @NotNull(message = "Policy value is required")
    @Positive(message = "Policy value must be greater than zero")
    private double value;

    @Size(max = 500, message = "Comment must not exceed 500 characters")
    private String comment;
}
