package com.project.backend.DTO.Employee;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelRequest {

    @NotNull(message = "User ID is required")
    @Positive(message = "User ID must be a positive number")
    private Long userId;

    @NotBlank(message = "Destination is required")
    @Size(max = 150, message = "Destination must not exceed 150 characters")
    private String destination;

    private String travelClass;

    @NotNull(message = "Travel start date is required")
    @FutureOrPresent(message = "Travel start date must be today or in the future")
    private LocalDate travelStartDate;

    @NotBlank(message = "Travel purpose is required")
    @Size(max = 255, message = "Travel purpose must not exceed 255 characters")
    private String purpose;

    @NotNull(message = "Stay duration is required")
    @Min(value = 1, message = "Stay duration must be at least 1 day")
    private Integer stay;

    @NotNull(message = "Estimated budget is required")
    @Positive(message = "Estimated budget must be greater than zero")
    private Double estimatedBudget;

    @Pattern(regexp = "^(DRAFT|PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED)$", message = "Status must be a valid status: DRAFT, PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED")
    private String status;

    private String justification;
}
