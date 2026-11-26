package com.project.backend.DTO.reimbursement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExpenseRequest {

    @NotBlank(message = "Expense category is required")
    @Pattern(regexp = "^(FOOD|STAY|TRANSPORT|MISCELLANEOUS)$", message = "Category must be one of: FOOD, STAY, TRANSPORT, MISCELLANEOUS")
    private String category;

    @NotNull(message = "Expense amount is required")
    @Positive(message = "Expense amount must be greater than zero")
    private Double amount;

    @NotNull(message = "Receipt or proof file is required")
    private MultipartFile file;
}
