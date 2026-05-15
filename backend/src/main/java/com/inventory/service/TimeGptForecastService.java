package com.inventory.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventory.model.Product;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.StockMovementRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeGptForecastService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.ai.timegpt.enabled:false}")
    private boolean enabled;

    @Value("${app.ai.timegpt.api-key:}")
    private String apiKey;

    @Value("${app.ai.timegpt.base-url:https://api.nixtla.io/forecast}")
    private String baseUrl;

    @Value("${app.ai.timegpt.model:timegpt-1}")
    private String model;

    @Value("${app.ai.timegpt.horizon-days:30}")
    private int horizonDays;

    @Value("${app.ai.timegpt.history-days:120}")
    private int historyDays;

    @Value("${app.ai.timegpt.cache-minutes:720}")
    private long cacheMinutes;

    private volatile String cachedForecast;
    private volatile long cachedAtMillis;
    private volatile String lastStatus = "TimeGPT has not been executed yet.";

    public String getLastStatus() {
        return lastStatus;
    }

    public String buildForecastSummary() {
        boolean timeGptEnabled = readBooleanEnv("TIMEGPT_ENABLED", enabled);
        String effectiveApiKey = firstNonBlank(System.getenv("TIMEGPT_API_KEY"), apiKey, readEnv("TIMEGPT_API_KEY"));
        if (!timeGptEnabled || effectiveApiKey == null || effectiveApiKey.isBlank()) {
            lastStatus = !timeGptEnabled
                    ? "TimeGPT is disabled by TIMEGPT_ENABLED=false."
                    : "TimeGPT API key is missing.";
            return null;
        }

        String effectiveBaseUrl = firstNonBlank(System.getenv("TIMEGPT_BASE_URL"), baseUrl, readEnv("TIMEGPT_BASE_URL"), "https://api.nixtla.io/forecast");
        String effectiveModel = firstNonBlank(System.getenv("TIMEGPT_MODEL"), model, readEnv("TIMEGPT_MODEL"), "timegpt-1");
        int effectiveHorizon = readIntEnv("TIMEGPT_HORIZON_DAYS", horizonDays);
        int effectiveHistoryDays = readIntEnv("TIMEGPT_HISTORY_DAYS", historyDays);
        long effectiveCacheMinutes = readLongEnv("TIMEGPT_CACHE_MINUTES", cacheMinutes);

        long now = System.currentTimeMillis();
        long ttlMillis = Math.max(effectiveCacheMinutes, 1) * 60_000L;
        if (cachedForecast != null && (now - cachedAtMillis) < ttlMillis) {
            lastStatus = "Using cached TimeGPT forecast.";
            return cachedForecast;
        }

        try {
            String forecast = generateForecast(effectiveApiKey, effectiveBaseUrl, effectiveModel, effectiveHorizon, effectiveHistoryDays);
            if (forecast == null || forecast.isBlank()) {
                if (lastStatus == null || lastStatus.isBlank()) {
                    lastStatus = "TimeGPT returned no forecast data.";
                }
                return null;
            }
            cachedForecast = forecast;
            cachedAtMillis = now;
            lastStatus = "TimeGPT forecast generated successfully.";
            return forecast;
        } catch (Exception ex) {
            log.error("TimeGPT forecast failed: {}", ex.getMessage());
            lastStatus = "TimeGPT request failed: " + ex.getMessage();
            return null;
        }
    }

    private String generateForecast(String effectiveApiKey, String effectiveBaseUrl, String effectiveModel,
            int effectiveHorizon, int effectiveHistoryDays) throws Exception {
        List<Product> products = productRepository.findByIsActiveTrue();
        if (products.isEmpty()) {
            lastStatus = "No active products found for forecasting.";
            return "No active products found for forecasting.";
        }

        LocalDate startDate = LocalDate.now().minusDays(Math.max(effectiveHistoryDays, 30));
        LocalDateTime since = startDate.atStartOfDay();

        Map<String, Product> productByKey = new HashMap<>();
        Map<String, Double> forecastByProduct = new HashMap<>();

        for (Product product : products) {
            String productKey = "product-" + product.getId();
            productByKey.put(productKey, product);

            Map<LocalDate, Long> demandByDay = new HashMap<>();
            stockMovementRepository.findDailyDemandSince(product.getId(), since)
                    .forEach(point -> demandByDay.put(point.getDay(), point.getQuantity() == null ? 0L : point.getQuantity()));

            List<Map<String, Object>> seriesRows = new ArrayList<>();
            LocalDate cursor = startDate;
            LocalDate endDate = LocalDate.now();
            while (!cursor.isAfter(endDate)) {
                long demand = demandByDay.getOrDefault(cursor, 0L);
                seriesRows.add(Map.of("unique_id", productKey, "ds", cursor.toString(), "y", demand));
                cursor = cursor.plusDays(1);
            }

            if (seriesRows.isEmpty()) {
                continue;
            }

            double projected = forecastProduct(effectiveApiKey, effectiveBaseUrl, effectiveModel, effectiveHorizon, productKey, seriesRows);
            if (projected > 0) {
                forecastByProduct.put(productKey, projected);
            }
        }

        if (forecastByProduct.isEmpty()) {
            lastStatus = "Insufficient demand history: add more OUT stock movements per product.";
            return null;
        }

        List<Map.Entry<String, Double>> sorted = forecastByProduct.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .toList();

        StringBuilder summary = new StringBuilder();
        summary.append("TimeGPT demand forecast (next ")
            .append(Math.max(effectiveHorizon, 1))
                .append(" days):\n");

        int maxItems = Math.min(sorted.size(), 8);
        for (int i = 0; i < maxItems; i++) {
            var entry = sorted.get(i);
            Product product = productByKey.get(entry.getKey());
            if (product == null) {
                continue;
            }
            long projected = Math.round(entry.getValue());
            int onHand = product.getQuantityOnHand() == null ? 0 : product.getQuantityOnHand();
            int reorderLevel = product.getReorderLevel() == null ? 0 : product.getReorderLevel();
            String priority = projected > onHand ? "HIGH" : (onHand <= reorderLevel ? "MEDIUM" : "LOW");

            summary.append(i + 1)
                    .append(". ")
                    .append(product.getName())
                    .append(" (SKU: ")
                    .append(product.getSku())
                    .append(") -> projected demand ")
                    .append(projected)
                    .append(", on-hand ")
                    .append(onHand)
                    .append(", priority ")
                    .append(priority)
                    .append("\n");
        }

        summary.append("Recommendation: prioritize HIGH items for reorder based on supplier lead time.");
        return summary.toString();
    }

    private double forecastProduct(String effectiveApiKey, String effectiveBaseUrl, String effectiveModel,
            int effectiveHorizon, String productKey, List<Map<String, Object>> seriesRows) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", effectiveModel);
        payload.put("freq", "D");
        payload.put("h", Math.max(effectiveHorizon, 1));
        payload.put("data", seriesRows);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(effectiveBaseUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + effectiveApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("TimeGPT returned HTTP {} for {}: {}", response.statusCode(), productKey, response.body());
            lastStatus = "TimeGPT returned HTTP " + response.statusCode() + ".";
            return 0;
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode valueNode = root.path("value");
        if (!valueNode.isArray()) {
            log.warn("Unexpected TimeGPT response format for {}: {}", productKey, response.body());
            lastStatus = "Unexpected TimeGPT response format.";
            return 0;
        }

        double total = 0;
        for (JsonNode value : valueNode) {
            if (value.isNumber()) {
                total += value.asDouble();
            }
        }
        return total;
    }

    private double extractForecastValue(JsonNode row) {
        return 0.0;
    }

    private String readEnv(String key) {
        Path envPath = locateEnvFile();
        if (envPath == null) {
            return null;
        }

        try {
            for (String line : Files.readAllLines(envPath)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                    continue;
                }
                int idx = trimmed.indexOf('=');
                String foundKey = trimmed.substring(0, idx).trim();
                if (foundKey.equals(key)) {
                    return trimmed.substring(idx + 1).trim();
                }
            }
        } catch (Exception ex) {
            log.debug("Unable to read .env fallback for {}: {}", key, ex.getMessage());
        }
        return null;
    }

    private Path locateEnvFile() {
        Path current = Path.of("").toAbsolutePath().normalize();
        for (int depth = 0; depth < 5 && current != null; depth++) {
            Path candidate = current.resolve(".env");
            if (Files.exists(candidate)) {
                return candidate;
            }
            current = current.getParent();
        }
        return null;
    }

    private boolean readBooleanEnv(String key, boolean defaultValue) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = readEnv(key);
        }
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Boolean.parseBoolean(value.trim());
    }

    private int readIntEnv(String key, int defaultValue) {
        String value = readEnv(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private long readLongEnv(String key, long defaultValue) {
        String value = readEnv(key);
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    @SafeVarargs
    private final <T> T firstNonBlank(T... values) {
        for (T value : values) {
            if (value != null && !value.toString().isBlank()) {
                return value;
            }
        }
        return null;
    }
}
