package com.project.backend.DTO.Manager;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamMemberResponse {
    private Long id;
    private String name;
    private String email;
    private String designation;
    private String departmentName;
}
