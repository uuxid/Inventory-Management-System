package com.inventory.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Data
public class CreateOrderRequest {
    private Long supplierId;
    private LocalDate expectedDate;
    private String notes;
    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Long productId;
        private Integer quantity;
        private BigDecimal unitCost;
    }
}
