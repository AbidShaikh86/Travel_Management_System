package com.project.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "department")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long deptId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "annual_travel_budget")
    private Double annualTravelBudget;

    @Column(name = "manager_id")
    private Long headId;
}
