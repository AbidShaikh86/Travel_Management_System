package com.project.backend.DTO.reimbursement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProofResponse {
    private Long id;
    private Long reimbursementId;
    private Long uploadedBy;
    private String fileName;
    private String storedFileName;
    private String contentType;
    private Long fileSize;
    private String url;
    private OffsetDateTime uploadedAt;
}
