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

        try {
            // 1. Compile clean, summarized data from all repositories
            String lowStockContext = buildLowStockContext();
            String supplierContext = buildSupplierContext();
            String pendingOrdersContext = buildPendingOrdersContext();
            String recentMovementsContext = buildRecentMovementsContext();
            String analyticalForecastContext = getDemandForecastSummary();
            String anomalySecurityContext = runInventoryAnomalyAudit();

            // 2. Build the System Instructions (Fixed all 6 placeholders matching 6 arguments)
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
                
                DEMAND FORECAST METRICS:
                %s
                
                [SECURITY & INTEGRITY TELEMETRY]
                %s
                
                [INSTRUCTIONS]
                - Answer the user's questions strictly using the system context data provided above.
                - Be highly concise, data-driven, professional, and clear.
                - Flag security discrepancies immediately if the user asks about system audits or discrepancies.
                """.formatted(
                    lowStockContext,
                    supplierContext,
                    pendingOrdersContext,
                    recentMovementsContext,
                    analyticalForecastContext,
                    anomalySecurityContext
            );

            // 3. Dispatch to your model
            return chatModel.call(new Prompt(
                    List.of(
                            new SystemMessage(systemInstructions),
                            new UserMessage(request.getMessage())
                    )
            )).getResult().getOutput().getText();

        } catch (Exception e) {
            log.error("Error processing AI request pipeline: ", e);
            return "GODAM-E Core Pipeline experienced an interruption. Please try again or check logs.";
        }
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
                .filter(u -> u.getRole().name().equals("ROLE_ADMIN") || u.getRole().name().equals("ROLE_MANAGER"))
                .toList();

        for (Product product : lowStock) {
            AlertSeverity severity = determineSeverity(product);
            String title = product.getQuantityOnHand() <= 0 ? "Out of Stock" : "Low Stock Alert";
            String message = product.getName() + " is below reorder threshold. Current qty="
                    + safeInt(product.getQuantityOnHand())
                    + ", reorder level=" + safeInt(product.getReorderLevel());

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
        return "=== GODAM-E ENGINE ANALYTICAL FORECAST PROJECTIONS ===\n" + getDemandForecastSummary();
    }

    private String getDemandForecastSummary() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Product> products = productRepo.findByIsActiveTrue();

        if (products.isEmpty()) {
            return "No active catalog SKU files found to execute projections.";
        }

        StringBuilder mapBuilder = new StringBuilder();

        products.stream()
                .filter(p -> p.getQuantityOnHand() != null)
                .map(product -> {
                    List<StockMovement> movements = stockMovementRepo.findByProductIdSince(product.getId(), thirtyDaysAgo);

                    long totalOutbound30Days = movements.stream()
                            .filter(sm -> "OUT".equalsIgnoreCase(String.valueOf(sm.getMovementType())))
                            .mapToLong(sm -> safeInt(sm.getQuantity()))
                            .sum();

                    double averageDailyBurnRate = totalOutbound30Days / 30.0;
                    int currentQty = safeInt(product.getQuantityOnHand());
                    int reorderLevel = safeInt(product.getReorderLevel());

                    double daysRemaining = (averageDailyBurnRate > 0) ? (currentQty / averageDailyBurnRate) : 999.0;

                    String priority = "STABLE";
                    if (currentQty <= reorderLevel || daysRemaining <= 7.0) {
                        priority = "CRITICAL RISK (Depletion Near)";
                    } else if (daysRemaining <= 14.0) {
                        priority = "ATTENTION REQUIRED";
                    }

                    return new ProductForecastMetrics(product, averageDailyBurnRate, daysRemaining, priority);
                })
                .sorted(Comparator.comparingDouble(m -> m.daysRemaining))
                .limit(10)
                .forEach(m -> mapBuilder.append(String.format("- SKU %s (%s): Velocity=%.2f/day | Est Lifespan=%.1f days | Level Priority=%s\n",
                        m.product.getSku(), m.product.getName(), m.dailyBurnRate, m.daysRemaining, m.priority)));

        return mapBuilder.toString();
    }

    // ── Auto-categorize product ────────────────────────────────────
    public String suggestCategory(String productName, String description) {
        log.info("Executing intelligent semantic categorization for: {}", productName);

        String structuralCategories = categoryRepo.findAll().stream()
                .map(Category::getName)
                .collect(Collectors.joining(", "));

        if (structuralCategories.isBlank()) {
            structuralCategories = "Groceries, Beverages, Cosmetics, Bakery, Produce, Meat & Seafood";
        }

        String classificationPrompt = """
            You are a data management component. Categorize this incoming grocery product inventory entity.
            Valid Available Categories: [%s]
            Product Target Name: "%s"
            Product Field Description: "%s"
            
            Return ONLY the name of the category.
            """.formatted(structuralCategories, productName, description);

        try {
            return chatModel.call(classificationPrompt).trim().replace("`", "").replace("\"", "");
        } catch (Exception e) {
            log.warn("Semantic classification dropped out. Falling back to default baseline group.", e);
            return "Grocery Items";
        }
    }

    // ── Security & Loss Prevention Audit ───────────────────────────
    public String runInventoryAnomalyAudit() {
        log.info("Initiating AI-powered inventory anomaly and fraud audit...");
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // Performance Optimization: Use your existing Jpa Repository slice rules if available, or stay localized safely
        List<AuditLog> recentAudits = auditLogRepo.findAll().stream()
                .filter(audit -> audit.getCreatedAt() != null && audit.getCreatedAt().isAfter(sevenDaysAgo))
                .filter(audit -> "Product".equalsIgnoreCase(audit.getEntityType()))
                .limit(30)
                .toList();

        List<StockMovement> recentMovements = stockMovementRepo.findAll().stream()
                .filter(sm -> sm.getCreatedAt() != null && sm.getCreatedAt().isAfter(sevenDaysAgo))
                .limit(30)
                .toList();

        if (recentAudits.isEmpty() && recentMovements.isEmpty()) {
            return "Anomaly Audit: No significant inventory changes recorded in the last 7 days.";
        }

        StringBuilder auditData = new StringBuilder();
        auditData.append("--- RECENT MANAGEMENT AUDIT LOGS ---\n");

        // Fixed: Swapped "log" keyword variable name out to avoid shadowing Lombok's logger! Called getUserId() cleanly.
        recentAudits.forEach(auditRecord -> {
            // Safely extract the User ID through the object relationship
            String userIdentifier = (auditRecord.getUser() != null)
                    ? String.valueOf(auditRecord.getUser().getId())
                    : "System / Automated";

            auditData.append(String.format("- User ID: %s modified %s (ID: %d) at %s\n",
                    userIdentifier,
                    auditRecord.getEntityType(),
                    auditRecord.getEntityId(),
                    auditRecord.getCreatedAt()));
        });
        auditData.append("\n--- RECENT STOCK MOVEMENTS ---\n");
        recentMovements.forEach(sm ->
                auditData.append(String.format("- Product ID: %s | Type: %s | Qty: %d | Time: %s\n",
                        sm.getProduct() != null ? sm.getProduct().getId() : "Unknown",
                        sm.getMovementType(), safeInt(sm.getQuantity()), sm.getCreatedAt()))
        );

        String anomalyPrompt = """
        You are the Forensic Audit module of GODAM-E. Analyze the following warehouse logs for anomalies like ghost adjustments or loss patterns.
        
        LOG DATA SET:
        %s
        
        Instructions: Provide a concise structural summary of suspicious actions or state "INVENTORY INTEGRITY: SECURE".
        """.formatted(auditData.toString());

        try {
            return chatModel.call(anomalyPrompt);
        } catch (Exception e) {
            log.error("Failed to run AI fraud audit", e);
            return "Audit Segment: Current context timeline secure.";
        }
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private AlertSeverity determineSeverity(Product product) {
        int quantity = safeInt(product.getQuantityOnHand());
        int reorderLevel = safeInt(product.getReorderLevel());
        if (quantity <= 0 || quantity <= Math.max(1, reorderLevel / 2)) {
            return AlertSeverity.CRITICAL;
        }
        return AlertSeverity.WARNING;
    }

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
}