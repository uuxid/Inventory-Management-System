package com.inventory.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.inventory.model.AuditLog;
import com.inventory.model.User;
import com.inventory.repository.AuditLogRepository;
import com.inventory.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditLogWriterService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public void log(String action, String entityType, Long entityId, String oldValue, String newValue) {
        String username = getCurrentUsername();
        logByUsername(username, action, entityType, entityId, oldValue, newValue);
    }

    public void logByUsername(String username, String action, String entityType, Long entityId,
            String oldValue, String newValue) {
        try {
            Optional<User> user = username != null ? userRepository.findByUsername(username) : Optional.empty();
            AuditLog log = AuditLog.builder()
                    .user(user.orElse(null))
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .ipAddress(getRequestIp())
                    .build();
            auditLogRepository.save(log);
        } catch (Exception ignored) {
            // Audit logging must never break the main operation.
        }
    }

    private String getCurrentUsername() {
        try {
            var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return null;
            }
            String principal = authentication.getName();
            return "anonymousUser".equalsIgnoreCase(principal) ? null : principal;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getRequestIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return null;
            }
            HttpServletRequest request = attrs.getRequest();
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception ignored) {
            return null;
        }
    }
}