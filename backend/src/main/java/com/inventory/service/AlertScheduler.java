package com.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlertScheduler {
    private final AIIntegrationService aiService;

    @Scheduled(cron = "0 0 8 * * *") // 8am daily
    public void runDailyAlerts() {
        log.info("Running scheduled AI alert generation...");
        aiService.generateAlerts();
    }

    @Scheduled(cron = "0 0 20 * * *") // 8pm daily
    public void runEveningAlerts() {
        log.info("Running evening AI alert generation...");
        aiService.generateAlerts();
    }
}
