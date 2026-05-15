package com.inventory.controller;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.dto.StockAdjustRequest;
import com.inventory.dto.StockMovementDTO;
import com.inventory.service.InventoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @PostMapping("/products/{productId}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<StockMovementDTO> adjust(
            @PathVariable Long productId,
            @RequestBody StockAdjustRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(inventoryService.adjustStock(productId, req, user.getUsername()));
    }

    @GetMapping("/products/{productId}/movements")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<List<StockMovementDTO>> getMovements(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getMovementsByProduct(productId));
    }

    @GetMapping("/products/{productId}/valuation/fifo")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Object>> getFIFOValue(@PathVariable Long productId) {
        BigDecimal value = inventoryService.calculateFIFOValue(productId);
        return ResponseEntity.ok(Map.of("productId", productId, "fifoValue", value));
    }

    @GetMapping("/products/{productId}/eoq")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, BigDecimal>> getEOQ(
            @PathVariable Long productId,
            @RequestParam BigDecimal annualDemand,
            @RequestParam BigDecimal orderCost,
            @RequestParam BigDecimal holdingCost) {
        return ResponseEntity.ok(inventoryService.calculateEOQ(productId, annualDemand, orderCost, holdingCost));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(inventoryService.getDashboardStats());
    }

    @GetMapping("/dashboard/received-vs-sold")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> getReceivedVsSold(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(inventoryService.getReceivedVsSold(days));
    }
}
