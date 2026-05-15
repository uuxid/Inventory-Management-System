package com.inventory.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventory.dto.AiChatRequest;
import com.inventory.model.AiAlert;
import com.inventory.model.Product;
import com.inventory.model.User;
import com.inventory.model.enums.AlertSeverity;
import com.inventory.model.enums.AlertType;
import com.inventory.repository.AiAlertRepository;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIIntegrationService {

    private final ProductRepository productRepo;
    private final AiAlertRepository alertRepo;
    private final UserRepository userRepo;
    private final TimeGptForecastService timeGptForecastService;

    // ── AI Chat assistant ──────────────────────────────────────────
    public String chat(AiChatRequest request, String username) {
        List<Product> activeProducts = productRepo.findByIsActiveTrue();
        List<Product> lowStock = productRepo.findLowStockProducts();
        long totalProducts = activeProducts.size();
        String rawMessage = request.getMessage() == null ? "" : request.getMessage().trim();
        String question = rawMessage.toLowerCase(Locale.ROOT);
        String displayName = toDisplayName(username);

        BigDecimal totalCostValue = activeProducts.stream()
            .map(p -> safeMoney(p.getCostPrice()).multiply(BigDecimal.valueOf(safeInt(p.getQuantityOnHand()))))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSalesValue = activeProducts.stream()
            .map(p -> safeMoney(p.getUnitPrice()).multiply(BigDecimal.valueOf(safeInt(p.getQuantityOnHand()))))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal potentialProfit = totalSalesValue.subtract(totalCostValue);
        BigDecimal marginPercent = totalSalesValue.compareTo(BigDecimal.ZERO) > 0
            ? potentialProfit.multiply(BigDecimal.valueOf(100)).divide(totalSalesValue, 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        if (question.isBlank()) {
            return "I am here to help, " + displayName + ". Ask me about low stock, reorder, supplier priority, available products, profit status, or demand forecast.";
        }

        if (isGreeting(question)) {
            return "Namaste " + displayName + "! I am your GODAM-E grocery helper. "
                    + "How can I help today with stock, reorder, supplier priority, product availability, profit, or forecast?";
        }

        if (question.contains("help") || question.contains("what can you do") || question.contains("how can you help")) {
            return "I can help you quickly with:\n"
                    + "- low-stock and reorder suggestions\n"
                    + "- supplier priority guidance\n"
                    + "- available product checks\n"
                    + "- profit status and margin\n"
                    + "- demand forecast\n"
                    + "Try: 'show low stock', 'profit status', or 'which supplier should I prioritize'.";
        }

        if (question.contains("profit") || question.contains("margin") || question.contains("earn")) {
            StringBuilder reply = new StringBuilder();
            reply.append("Profit details (based on current on-hand stock):\n");
            reply.append("- Total cost value: ").append(formatMoney(totalCostValue)).append("\n");
            reply.append("- Total sales value: ").append(formatMoney(totalSalesValue)).append("\n");
            reply.append("- Potential gross profit: ").append(formatMoney(potentialProfit)).append("\n");
            reply.append("- Potential gross margin: ").append(marginPercent).append("%\n");
            reply.append("Tip: this is stock-based potential profit, not booked sales profit.");
            return reply.toString();
        }

        if (question.contains("summary") || question.contains("overview") || question.contains("status")) {
            return buildSummary(totalProducts, lowStock.size(), potentialProfit, marginPercent);
        }

        if (question.contains("low stock") || question.contains("reorder") || question.contains("stock")) {
            StringBuilder reply = new StringBuilder();
            if (lowStock.isEmpty()) {
                reply.append("All products are currently above reorder level.");
            } else {
                reply.append("Items needing attention:\n");
                lowStock.stream()
                        .sorted(Comparator.comparing(Product::getQuantityOnHand, Comparator.nullsLast(Integer::compareTo)))
                        .limit(5)
                        .forEach(p -> reply.append("- ")
                                .append(p.getName())
                                .append(" (SKU: ").append(p.getSku()).append(")")
                                .append(" qty=").append(safeInt(p.getQuantityOnHand()))
                                .append(" / reorder level=").append(safeInt(p.getReorderLevel()))
                                .append(" / suggested reorder qty=").append(safeInt(p.getReorderQuantity()))
                                .append("\n"));
            }
            return reply.toString();
        }

        if (question.contains("supplier") || question.contains("priority")) {
            if (lowStock.isEmpty()) {
                return "No urgent supplier action needed right now. All active products are above reorder level.";
            }
            StringBuilder reply = new StringBuilder("Supplier priority suggestions based on low stock:\n");
            lowStock.stream()
                    .sorted(Comparator.comparing(Product::getQuantityOnHand, Comparator.nullsLast(Integer::compareTo)))
                    .limit(5)
                    .forEach(p -> reply.append("- ")
                            .append(p.getSupplier() != null ? p.getSupplier().getName() : "Unknown supplier")
                            .append(" -> ")
                            .append(p.getName())
                            .append(" (qty=").append(safeInt(p.getQuantityOnHand()))
                            .append(", reorder=").append(safeInt(p.getReorderLevel()))
                            .append(")\n"));
            return reply.toString();
        }

        if (question.contains("product") || question.contains("search") || question.contains("available")) {
            StringBuilder reply = new StringBuilder();
            reply.append("Top available products:\n");
            activeProducts.stream().limit(5).forEach(p -> reply.append("- ")
                    .append(p.getName())
                    .append(" (SKU: ").append(p.getSku()).append(")")
                    .append(" qty=").append(safeInt(p.getQuantityOnHand()))
                    .append("\n"));
            return reply.toString();
        }

        if (question.contains("forecast") || question.contains("demand")) {
            return getDemandForecast();
        }

        if (question.contains("thank")) {
            return "You are welcome, " + displayName + ". I am always here to help with your grocery operations.";
        }

        return "I am here to help, " + displayName + ". I did not fully understand that yet. "
                + "Try asking: low stock, reorder, supplier priority, available products, profit status, or forecast.";
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
        String timeGptForecast = timeGptForecastService.buildForecastSummary();
        if (timeGptForecast != null && !timeGptForecast.isBlank()) {
            return timeGptForecast;
        }

        String reason = timeGptForecastService.getLastStatus();

        List<Product> products = productRepo.findByIsActiveTrue();
        StringBuilder summary = new StringBuilder();
        summary.append("TimeGPT fallback mode. ")
                .append(reason == null || reason.isBlank() ? "Reason unavailable." : "Reason: " + reason)
                .append("\n")
                .append("Basic stock-based forecast:\n");
        products.stream()
                .filter(p -> p.getQuantityOnHand() != null)
                .sorted(Comparator.comparing(Product::getQuantityOnHand))
                .limit(8)
                .forEach(p -> {
                    String priority = p.getQuantityOnHand() <= safeInt(p.getReorderLevel()) ? "HIGH" : "LOW";
                    summary.append("- ").append(p.getName())
                            .append(" (SKU: ").append(p.getSku()).append(")")
                            .append(" qty=").append(safeInt(p.getQuantityOnHand()))
                            .append(" reorder level=").append(safeInt(p.getReorderLevel()))
                            .append(" priority=").append(priority)
                            .append("\n");
                });
        return summary.toString();
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

    private BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String formatMoney(BigDecimal amount) {
        return "NRS " + safeMoney(amount).setScale(2, RoundingMode.HALF_UP);
    }

    private String buildSummary(long totalProducts, int lowStockCount, BigDecimal potentialProfit, BigDecimal marginPercent) {
        return "GODAM-E grocery summary:\n"
                + "- Total active items: " + totalProducts + "\n"
                + "- Low stock items: " + lowStockCount + "\n"
                + "- Profit status (potential): " + formatMoney(potentialProfit)
                + " (margin " + marginPercent.setScale(2, RoundingMode.HALF_UP) + "%)";
    }

    private String toDisplayName(String username) {
        if (username == null || username.isBlank()) {
            return "there";
        }
        String normalized = username.trim();
        int atIndex = normalized.indexOf('@');
        if (atIndex > 0) {
            normalized = normalized.substring(0, atIndex);
        }
        if (normalized.isBlank()) {
            return "there";
        }
        return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
    }

    private boolean isGreeting(String question) {
        return question.equals("hi")
                || question.equals("hello")
                || question.equals("hey")
                || question.equals("namaste")
                || question.startsWith("hi ")
                || question.startsWith("hello ")
                || question.startsWith("hey ")
                || question.startsWith("good morning")
                || question.startsWith("good afternoon")
                || question.startsWith("good evening");
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private AlertSeverity determineSeverity(Product product) {
        int quantity = safeInt(product.getQuantityOnHand());
        int reorderLevel = safeInt(product.getReorderLevel());
        if (quantity <= 0) {
            return AlertSeverity.CRITICAL;
        }
        if (quantity <= Math.max(1, reorderLevel / 2)) {
            return AlertSeverity.CRITICAL;
        }
        return AlertSeverity.WARNING;
    }
}
