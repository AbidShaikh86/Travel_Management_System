package com.project.backend.DTO.reimbursement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExpenseResponse {
    private Long id;
    private String category;
    private Double amount;
    private String proofFileName;
    private String proofUrl;
    private LocalDateTime createdAt;
}
