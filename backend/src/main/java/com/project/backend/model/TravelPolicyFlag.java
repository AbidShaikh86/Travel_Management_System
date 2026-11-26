package com.project.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.project.backend.model.Enumerator.PolicyType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_policy_flag")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TravelPolicyFlag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "travel_id")
    private TravelDetail travelDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_id")
    private Policy policy;
    private String policyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "policy_type", nullable = false)
    private PolicyType policyType;
    private String justification;
}
