package com.inventory.dto;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Data @Builder
public class OrderDTO {
    private Long id;
    private String orderNo;
    private Long supplierId;
    private String supplierName;
    private String createdByUsername;
    private String approvedByUsername;
    private String status;
    private BigDecimal totalAmount;
    private String notes;
    private LocalDate expectedDate;
    private LocalDate receivedDate;
    private LocalDateTime createdAt;
    private Integer itemCount;
}
