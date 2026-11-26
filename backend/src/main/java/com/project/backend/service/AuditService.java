package com.project.backend.service;

import com.project.backend.DTO.AuditLogResponse;
import com.project.backend.model.AuditLog;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.User;
import com.project.backend.repository.AuditLogRepository;
import com.project.backend.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditService {
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAllAuditLogs() {
        List<AuditLog> auditLogs = this.auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "performedAt"));

        return auditLogs.stream().map(auditLog -> {
            String performedByName = "System";
            if (auditLog.getPerformedBy() != null) {
                performedByName = this.userRepository.findById(auditLog.getPerformedBy())
                        .map(User::getName)
                        .orElse("Unknown");
            }

            return AuditLogResponse.builder()
                    .id(auditLog.getId())
                    .entityType(auditLog.getEntityType() != null ? auditLog.getEntityType() : null)
                    .entityId(auditLog.getEntityId())
                    .action(auditLog.getAction())
                    .performedBy(auditLog.getPerformedBy())
                    .performedByName(performedByName)
                    .performedAt(auditLog.getPerformedAt())
                    .details(auditLog.getDetails())
                    .build();
        }).toList();
    }

    @Transactional
    public void log(AuditEntityType entityType, Long entityId, String action, String details) {
        AuditLog auditLog = AuditLog.builder()
                .entityType(String.valueOf(entityType))
                .entityId(entityId)
                .action(action)
                .performedBy(resolveCurrentUserId())
                .details(details)
                .build();

        this.auditLogRepository.save(auditLog);
    }

    private Long resolveCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        // CustomUserDetailsService sets email as username; audit_log.performed_by FK expects users.id

        return userRepository.findByEmail(auth.getName())
                .map(User::getId)
                .orElse(null);
    }
}
