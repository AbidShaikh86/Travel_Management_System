package com.project.backend.DTO.Manager;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FlaggedPolicyResponse {
    private Long id;
    private Long policyId;
    private String policyName;
    private String policyType;
    private String justification;
}
