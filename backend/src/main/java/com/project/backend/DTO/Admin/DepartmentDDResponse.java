package com.project.backend.DTO.Admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DepartmentDDResponse {
    private Long id;
    private String name;
    private Double annualTravelBudget;
    private Double totalAllocatedBudget;
}
