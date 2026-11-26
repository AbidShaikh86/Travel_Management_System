package com.project.backend.model;

import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Enumerator.TravelClass;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "travel_detail")
public class TravelDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emp_id")
    private User user;

    @Column(name = "budget")
    private Double estimatedBudget;

    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_class")
    private TravelClass travelClass;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "stay_days")
    private Integer stay;

    @Column(name = "travel_date")
    private LocalDate travelStartDate;

    private String destination;

    @OneToOne(mappedBy = "travelDetail")
    private ApprovalFlow approvalFlow;

    private Boolean isFlagged;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }


}
