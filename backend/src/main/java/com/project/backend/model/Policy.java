package com.project.backend.model;

import com.project.backend.model.Enumerator.PolicyType;
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
@Table(name = "policy")
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    private PolicyType type;

    @Column(name = "travel_class")
    private String travelClass;

    private double value;

    private int stay;

    private String comment;

    @Builder.Default
    private boolean active = true;
}
