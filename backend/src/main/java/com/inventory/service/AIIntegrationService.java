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
public class AIIntegrationService {

    private final ProductRepository productRepo;
    private final ChatModel chatModel; // Injected from Spring AI

    public String chat(AiChatRequest request, String username) {
        // 1. Gather the "Context" (The data the AI needs to know)
        List<Product> lowStock = productRepo.findLowStockProducts();
        
        // 2. Create a "System Prompt" (The instructions for the AI)
        String systemInstructions = """
            You are GODAM-E, a professional grocery inventory assistant. 
            Here is the current low-stock data: %s.
            Use this data to answer the user's question accurately. 
            Be concise and helpful.
            """.formatted(lowStock.toString());

        // 3. Call the AI
        return chatModel.call(new Prompt(
            List.of(
                new SystemMessage(systemInstructions),
                new UserMessage(request.getMessage())
            )
        )).getResult().getOutput().getContent();
    }
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
