package com.inventory.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.inventory.dto.AuditLogDTO;
import com.inventory.model.AuditLog;
import com.inventory.repository.AuditLogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public List<AuditLogDTO> getAllAuditLogs() {
        return auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public List<AuditLogDTO> getAuditLogsByEntityType(String entityType) {
        return auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(log -> log.getEntityType() != null && log.getEntityType().equalsIgnoreCase(entityType))
                .map(this::toDTO)
                .toList();
    }

    public List<AuditLogDTO> getAuditLogsByUserId(Long userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public List<AuditLogDTO> getAuditLogsByAction(String action) {
        return auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(log -> log.getAction() != null && log.getAction().equalsIgnoreCase(action))
                .map(this::toDTO)
                .toList();
    }

    public List<AuditLogDTO> getAuditLogsForEntityTypeAndId(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public List<AuditLogDTO> getRecentAuditLogs(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return auditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(log -> log.getCreatedAt() != null && log.getCreatedAt().isAfter(since))
                .map(this::toDTO)
                .toList();
    }

    private AuditLogDTO toDTO(AuditLog log) {
        return AuditLogDTO.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .username(log.getUser() != null ? log.getUser().getUsername() : "Unknown")
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
