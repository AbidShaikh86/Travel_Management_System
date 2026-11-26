package com.project.backend.model;

import com.project.backend.model.Enumerator.AuditEntityType;
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
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    private String action;

    @Column(name = "performed_by")
    private Long performedBy;

    @Column(name = "performed_at")
    private LocalDateTime performedAt;

    private String details;

    @PrePersist
    protected void onCreate() {
        performedAt = LocalDateTime.now();
    }
}
