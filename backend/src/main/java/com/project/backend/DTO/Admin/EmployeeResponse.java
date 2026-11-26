package com.project.backend.DTO.Admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmployeeResponse {
    private String name;

    private Integer age;

    private String gender;

    private String email;

    private String designation;

    private Long managerId;

    private Long departmentId;
}
