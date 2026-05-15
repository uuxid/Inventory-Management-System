package com.inventory.controller;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.dto.AiAlertDTO;
import com.inventory.dto.AiChatRequest;
import com.inventory.repository.AiAlertRepository;
import com.inventory.repository.UserRepository;
import com.inventory.service.AIIntegrationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {
    private final AIIntegrationService aiService;
    private final AiAlertRepository alertRepo;
    private final UserRepository userRepo;

    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> chat(@RequestBody AiChatRequest req,
                                                    @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(Map.of("response", aiService.chat(req, ud.getUsername())));
    }

    @GetMapping("/forecast")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> forecast() {
        return ResponseEntity.ok(Map.of("forecast", aiService.getDemandForecast()));
    }

    @PostMapping("/generate-alerts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> generateAlerts() {
        aiService.generateAlerts();
        return ResponseEntity.ok(Map.of("status", "Alerts generated successfully"));
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<AiAlertDTO>> getAlerts(@AuthenticationPrincipal UserDetails ud) {
        var user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        var alerts = alertRepo.findByCreatedForIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(a -> AiAlertDTO.builder()
                        .id(a.getId())
                        .productId(a.getProduct() != null ? a.getProduct().getId() : null)
                        .productName(a.getProduct() != null ? a.getProduct().getName() : null)
                        .alertType(a.getAlertType() != null ? a.getAlertType().name() : null)
                        .severity(a.getSeverity() != null ? a.getSeverity().name() : null)
                        .title(a.getTitle())
                        .message(a.getMessage())
                        .isRead(a.getIsRead())
                        .createdAt(a.getCreatedAt())
                    .build())
                        .toList();
        return ResponseEntity.ok(alerts);
    }

    @PatchMapping("/alerts/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        alertRepo.findById(id).ifPresent(a -> { a.setIsRead(true); alertRepo.save(a); });
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/alerts/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal UserDetails ud) {
        var user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        long count = alertRepo.countByCreatedForIdAndIsReadFalse(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }
}
