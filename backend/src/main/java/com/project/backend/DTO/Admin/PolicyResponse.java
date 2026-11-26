package com.project.backend.DTO.Admin;

import com.project.backend.model.Enumerator.PolicyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PolicyResponse {
    private Long id;

    private String name;

    private String type;

    private String travelClass;

    private double value;

    private int stay;

    private String comment;

    private boolean active;

    private Integer totalPolicy;
}
