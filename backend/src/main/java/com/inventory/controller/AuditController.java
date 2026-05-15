package com.inventory.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.dto.AuditLogDTO;
import com.inventory.service.AuditService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<AuditLogDTO>> getAllAuditLogs() {
        return ResponseEntity.ok(auditService.getAllAuditLogs());
    }

    @GetMapping("/entity-type/{entityType}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsByEntityType(@PathVariable String entityType) {
        return ResponseEntity.ok(auditService.getAuditLogsByEntityType(entityType));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(auditService.getAuditLogsByUserId(userId));
    }

    @GetMapping("/action/{action}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsByAction(@PathVariable String action) {
        return ResponseEntity.ok(auditService.getAuditLogsByAction(action));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLogDTO>> getAuditLogsForEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(auditService.getAuditLogsForEntityTypeAndId(entityType, entityId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<AuditLogDTO>> getRecentAuditLogs(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(auditService.getRecentAuditLogs(days));
    }
}
