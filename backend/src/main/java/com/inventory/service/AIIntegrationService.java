package com.inventory.service;

import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.ai.chat.model.ChatModel;
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
@Slf4j // Ensure you have Lombok for this
public class AIIntegrationService {

    private final ProductRepository productRepo;
    private final UserRepository userRepo;        // Added missing repo
    private final AiAlertRepository alertRepo;    // Added missing repo
    private final ChatModel chatModel;            // Spring AI
    // private final TimeGptForecastService timeGptForecastService; // Add if you have this service

    public String chat(AiChatRequest request, String username) {
        List<Product> lowStock = productRepo.findLowStockProducts();

        String systemInstructions = """
            You are GODAM-E, a professional grocery inventory assistant. 
            Here is the current low-stock data: %s.
            Use this data to answer the user's question accurately. 
            Be concise and helpful.
            """.formatted(lowStock.toString());


        return chatModel.call(new Prompt(
                List.of(
                        new SystemMessage(systemInstructions),
                        new UserMessage(request.getMessage())
                )
        )).getResult().getOutput().getText();
    }

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

    public String getDemandForecast() {
        // Fallback logic if TimeGPT service is missing or fails
        List<Product> products = productRepo.findByIsActiveTrue();
        StringBuilder summary = new StringBuilder();
        summary.append("Basic stock-based forecast:\n");

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
} // End of class
