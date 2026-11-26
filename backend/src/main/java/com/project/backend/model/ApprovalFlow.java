package com.project.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.project.backend.model.Enumerator.ApprovalLevel;
import com.project.backend.model.Enumerator.Status;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "approval_flow")
public class ApprovalFlow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_id")
    private TravelDetail travelDetail;

    @Column(name = "manager_id")
    private Long managerId;

    @Enumerated(EnumType.STRING)
    private Status status;

    private String comment;

    @Column(name = "action_date")
    private LocalDateTime actionDate;
}
