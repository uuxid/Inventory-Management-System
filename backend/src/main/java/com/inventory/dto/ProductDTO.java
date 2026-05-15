package com.inventory.dto;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Data @Builder
public class ProductDTO {
    private Long id;
    private String name;
    private String sku;
    private String barcode;
    private String description;
    private String imageUrl;
    private Long categoryId;
    private String categoryName;
    private Long supplierId;
    private String supplierName;
    private BigDecimal unitPrice;
    private BigDecimal costPrice;
    private Integer quantityOnHand;
    private Integer reorderLevel;
    private Integer reorderQuantity;
    private String valuationMethod;
    private String location;
    private Boolean isActive;
    private Boolean isLowStock;
    private LocalDateTime createdAt;
}
