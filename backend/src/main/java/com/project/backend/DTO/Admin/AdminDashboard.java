package com.project.backend.DTO.Admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminDashboard {
    private Long id;
    private String name;
    private String email;
    private String designation;
    private String role;
    private String departmentName;
    private Long departmentId;
    private String managerName;
    private Long managerId;
    private Integer totalWorkforce;
}
