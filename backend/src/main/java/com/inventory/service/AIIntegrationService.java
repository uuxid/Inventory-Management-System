package com.inventory.service;

import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import com.inventory.dto.AiChatRequest;
import com.inventory.model.*;
import com.inventory.model.enums.*;
import com.inventory.repository.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIIntegrationService {

    private final ProductRepository productRepo;
    private final UserRepository userRepo;
    private final AiAlertRepository alertRepo;
    private final SupplierRepository supplierRepo;
    private final StockMovementRepository stockMovementRepo;
    private final PurchaseOrderRepository purchaseOrderRepo;
    private final CategoryRepository categoryRepo;
    private final AuditLogRepository auditLogRepo;

    private final ChatModel chatModel;

    public String chat(AiChatRequest request, String username) {
        log.info("Processing AI Chat Request for user: {}", username);

        // 1. Compile clean, summarized data from all repositories
        String lowStockContext = buildLowStockContext();
        String supplierContext = buildSupplierContext();
        String pendingOrdersContext = buildPendingOrdersContext();
        String recentMovementsContext = buildRecentMovementsContext();

        // 2. Build the System Instructions
        String systemInstructions = """
            You are GODAM-E, an advanced, professional grocery inventory intelligence assistant.
            You have access to the real-time operational state of the warehouse outlined below.
            
            [SYSTEM CONTEXT DATA]
            
            CRITICAL STOCK ALERTS:
            %s
            
            ACTIVE SUPPLIERS:
            %s
            
            PENDING REORDERS / PURCHASE ORDERS:
            %s
            
            RECENT MOVEMENT AGGREGATION (Last 30 Days):
            %s
            
            [INSTRUCTIONS]
            - Answer the user's questions strictly using the system context data provided above.
            - Be highly concise, data-driven, professional, and clear.
            - If details on specific metrics are missing or not explicitly given, state that you cannot see that slice of data.
            - Provide recommendations if a user inquires about critical low-stock items or bottlenecks.
            """.formatted(lowStockContext, supplierContext, pendingOrdersContext, recentMovementsContext);

        // 3. Dispatch to your Groq/Llama-3 model
        return chatModel.call(new Prompt(
                List.of(
                        new SystemMessage(systemInstructions),
                        new UserMessage(request.getMessage())
                )
        )).getResult().getOutput().getText();
    }

    // ── Context Builder Helpers ────────────────────────────────────

    private String buildLowStockContext() {
        List<Product> lowStock = productRepo.findLowStockProducts();
        if (lowStock.isEmpty()) {
            return "No items are currently under the low stock threshold.";
        }
        return lowStock.stream()
                .map(p -> String.format("- %s (SKU: %s) | Qty Available: %d | Reorder Trigger: %d | Target Qty: %d",
                        p.getName(), p.getSku(), safeInt(p.getQuantityOnHand()), safeInt(p.getReorderLevel()), safeInt(p.getReorderQuantity())))
                .collect(Collectors.joining("\n"));
    }

    private String buildSupplierContext() {
        List<Supplier> activeSuppliers = supplierRepo.findByIsActiveTrue();
        if (activeSuppliers.isEmpty()) {
            return "No active suppliers recorded.";
        }
        return activeSuppliers.stream()
                .map(s -> String.format("- %s (Lead Time: %s days)", s.getName(),
                        s.getLeadTimeDays() != null ? s.getLeadTimeDays() : "N/A"))
                .collect(Collectors.joining("\n"));
    }

    private String buildPendingOrdersContext() {
        // Find orders that are currently pending/processing (Adjust OrderStatus mapping to match your enum names)
        List<PurchaseOrder> pendingOrders = purchaseOrderRepo.findAll().stream()
                .filter(po -> po.getStatus() != OrderStatus.ORDERED && po.getStatus() != OrderStatus.CANCELLED)
                .limit(10)
                .toList();

        if (pendingOrders.isEmpty()) {
            return "No active or pending purchase orders in transit.";
        }
        return pendingOrders.stream()
                .map(po -> String.format("- PO #%d | Status: %s | Supplier ID: %s",
                        po.getId(), po.getStatus(), po.getSupplier() != null ? po.getSupplier().getId() : "Unknown"))
                .collect(Collectors.joining("\n"));
    }

    private String buildRecentMovementsContext() {
        // Aggregate movements from the past 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Object[]> aggregates = stockMovementRepo.aggregateMovementsByType(thirtyDaysAgo);

        if (aggregates.isEmpty()) {
            return "No stock movements recorded in the last 30 days.";
        }

        StringBuilder builder = new StringBuilder();
        for (Object[] row : aggregates) {
            String type = row[0] != null ? row[0].toString() : "UNKNOWN";
            String qty = row[1] != null ? row[1].toString() : "0";
            builder.append(String.format("- Type: %s | Gross Quantity Moved: %s\n", type, qty));
        }
        return builder.toString();
    }

    // ── Generate daily AI alerts ───────────────────────────────────
    @Transactional
    public void generateAlerts() {
        log.info("Running AI alert generation...");
        List<Product> lowStock = productRepo.findLowStockProducts();
        if (lowStock.isEmpty()) return;

        List<User> managers = userRepo.findAll().stream()
                .filter(u -> u.getRole().name().equals("ROLE_ADMIN")
                        || u.getRole().name().equals("ROLE_MANAGER"))
                .toList();

        for (Product product : lowStock) {
            AlertSeverity severity = determineSeverity(product);
            String title = product.getQuantityOnHand() <= 0 ? "Out of Stock" : "Low Stock Alert";
            String message = product.getName() + " is below reorder threshold. Current qty="
                    + safeInt(product.getQuantityOnHand())
                    + ", reorder level=" + safeInt(product.getReorderLevel())
                    + ", suggested reorder qty=" + safeInt(product.getReorderQuantity())
                    + ", supplier lead days="
                    + (product.getSupplier() != null ? product.getSupplier().getLeadTimeDays() : "unknown");

            for (User manager : managers) {
                alertRepo.save(AiAlert.builder()
                        .product(product)
                        .alertType(AlertType.LOW_STOCK)
                        .severity(severity)
                        .title(title)
                        .message(message)
                        .createdFor(manager)
                        .build());
            }
        }
    }

    // ── Demand forecast ────────────────────────────────────────────
    public String getDemandForecast() {
        log.info("Generating advanced local demand forecast analytics...");

        // 1. Establish time horizons
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // 2. Fetch active items
        List<Product> products = productRepo.findByIsActiveTrue();
        if (products.isEmpty()) {
            return "Demand Forecast: No active products found to evaluate.";
        }

        // 3. Compute Outbound Demand Velocity across all items using StockMovements
        // Aggregates total 'OUT' quantity per product ID over the last 30 days
        Map<Long, Long> productOutboundVolumeMap = stockMovementRepo.findAll().stream()
                .filter(sm -> sm.getCreatedAt() != null && sm.getCreatedAt().isAfter(thirtyDaysAgo))
                .filter(sm -> "OUT".equalsIgnoreCase(String.valueOf(sm.getMovementType())))
                .filter(sm -> sm.getProduct() != null)
                .collect(Collectors.groupingBy(
                        sm -> sm.getProduct().getId(),
                        Collectors.summingLong(sm -> safeInt(sm.getQuantity()))
                ));

        StringBuilder summary = new StringBuilder();
        summary.append("=== GODAM-E ADVANCED DEMAND FORECAST (30-Day Rolling Window) ===\n");

        // 4. Analyze and sort the top 8 products at risk or having high velocity
        products.stream()
                .filter(p -> p.getQuantityOnHand() != null)
                .map(product -> {
                    long totalOutbound30Days = productOutboundVolumeMap.getOrDefault(product.getId(), 0L);

                    // Average daily usage (Velocity)
                    double averageDailyBurnRate = totalOutbound30Days / 30.0;

                    int currentQty = safeInt(product.getQuantityOnHand());
                    int reorderLevel = safeInt(product.getReorderLevel());

                    // Calculate Days of Stock Remaining
                    double daysRemaining = (averageDailyBurnRate > 0) ? (currentQty / averageDailyBurnRate) : 999.0;

                    // Smart Priority logic
                    String priority = "LOW";
                    if (currentQty <= reorderLevel || daysRemaining <= 7.0) {
                        priority = "CRITICAL (Urgent Reorder)";
                    } else if (daysRemaining <= 14.0) {
                        priority = "MEDIUM (Monitor)";
                    }

                    return new ProductForecastMetrics(product, averageDailyBurnRate, daysRemaining, priority);
                })
                // Sort by products running out the fastest (lowest days remaining first)
                .sorted(Comparator.comparingDouble(m -> m.daysRemaining))
                .limit(8)
                .forEach(metrics -> {
                    Product p = metrics.product;
                    summary.append(String.format("- %s (SKU: %s)\n", p.getName(), p.getSku()))
                            .append(String.format("  Current Qty: %d | Reorder Trigger Level: %d\n", safeInt(p.getQuantityOnHand()), safeInt(p.getReorderLevel())))
                            .append(String.format("  Daily Velocity: %.2f units/day\n", metrics.dailyBurnRate))
                            .append(String.format("  Est. Stock Lifespan: %s\n", metrics.daysRemaining >= 999 ? "Stable (No Recent Sales)" : String.format("%.1f days remaining", metrics.daysRemaining)))
                            .append(String.format("  Action Priority: %s\n\n", metrics.priority));
                });

        return summary.toString();
    }

    // Simple internal helper class to hold calculations on the stream flyweight
    private static class ProductForecastMetrics {
        final Product product;
        final double dailyBurnRate;
        final double daysRemaining;
        final String priority;

        ProductForecastMetrics(Product product, double dailyBurnRate, double daysRemaining, String priority) {
            this.product = product;
            this.dailyBurnRate = dailyBurnRate;
            this.daysRemaining = daysRemaining;
            this.priority = priority;
        }
    }

    // ── Auto-categorize product ────────────────────────────────────
    public String suggestCategory(String productName, String description) {
        String text = (productName + " " + description).toLowerCase(Locale.ROOT);
        if (containsAny(text, "juice", "tea", "coffee", "cola", "water", "beverage", "drink", "soda", "lassi")) {
            return "Beverages";
        }
        if (containsAny(text, "rice", "dal", "lentil", "flour", "sugar", "salt", "oil", "spice", "masala", "grocery")) {
            return "Grocery Items";
        }
        if (containsAny(text, "shampoo", "soap", "cream", "lotion", "cosmetic", "face wash", "toothpaste")) {
            return "Cosmetics";
        }
        if (containsAny(text, "spinach", "tomato", "potato", "onion", "cabbage", "cauliflower", "vegetable", "veg")) {
            return "Veg Items";
        }
        if (containsAny(text, "chicken", "mutton", "fish", "buff", "meat", "egg", "prawn", "non veg")) {
            return "Non Veg Items";
        }
        if (containsAny(text, "almond", "cashew", "walnut", "raisin", "pistachio", "dates", "dry fruit")) {
            return "Dry Fruits";
        }
        return "Grocery Items";
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) return true;
        }
        return false;
    }

    private AlertSeverity determineSeverity(Product product) {
        int quantity = safeInt(product.getQuantityOnHand());
        int reorderLevel = safeInt(product.getReorderLevel());
        if (quantity <= 0 || quantity <= Math.max(1, reorderLevel / 2)) {
            return AlertSeverity.CRITICAL;
        }
        return AlertSeverity.WARNING;
    }
}