package com.inventory.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAlertDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String alertType;
    private String severity;
    private String title;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}