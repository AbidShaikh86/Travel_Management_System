package com.project.backend.controller;

import com.project.backend.DTO.AuditLogResponse;
import com.project.backend.service.AuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditLogResponse> getAllAuditLogs() {
        return this.auditService.getAllAuditLogs();
    }
}
