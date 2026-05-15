package com.inventory.dto;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Data @Builder
public class StockMovementDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String username;
    private String movementType;
    private Integer quantity;
    private BigDecimal unitCost;
    private String referenceNo;
    private String notes;
    private LocalDateTime createdAt;
}
