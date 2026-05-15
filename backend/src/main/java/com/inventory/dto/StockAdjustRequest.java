package com.inventory.dto;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class StockAdjustRequest {
    private String movementType;
    private Integer quantity;
    private BigDecimal unitCost;
    private String referenceNo;
    private String notes;
}
