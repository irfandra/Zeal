package com.digitalseal.service;

import com.digitalseal.dto.response.PlatformLogResponse;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.LogLevel;
import com.digitalseal.model.entity.PlatformLog;
import com.digitalseal.repository.PlatformLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PlatformLogService {

    private final PlatformLogRepository logRepository;


    
    private void persist(PlatformLog entry) {
        try {

            String line = buildLogLine(entry);
            switch (entry.getLevel()) {
                case ERROR -> log.error(line);
                case WARN  -> log.warn(line);
                default    -> log.info(line);
            }

            logRepository.save(entry);
        } catch (Exception ex) {
            log.error("[SYSTEM][LOG_WRITE_FAILED] action={} error={}", entry.getAction(), ex.getMessage());
        }
    }

    
    private String buildLogLine(PlatformLog e) {
        StringBuilder sb = new StringBuilder();
        sb.append('[').append(e.getCategory()).append(']');
        sb.append('[').append(e.getAction()).append(']');

        if (e.getDetails() != null)    sb.append(' ').append(e.getDetails());

        if (e.getUserEmail() != null)  sb.append(" | user=").append(e.getUserEmail());
        else if (e.getUserId() != null) sb.append(" | user=id:").append(e.getUserId());
        else                            sb.append(" | user=anonymous");

        if (e.getEntityType() != null) sb.append(" | entity=").append(e.getEntityType())
                                        .append(':').append(e.getEntityId());

        if (e.getHttpMethod() != null) sb.append(" | ").append(e.getHttpMethod())
                                        .append(' ').append(e.getRequestPath());

        if (e.getIpAddress() != null)  sb.append(" | ip=").append(e.getIpAddress());
        if (e.getDurationMs() != null) sb.append(" | ").append(e.getDurationMs()).append("ms");

        sb.append(e.getSuccess() ? " | OK" : " | FAILED");

        if (e.getErrorMessage() != null) sb.append(" | error=").append(e.getErrorMessage());

        return sb.toString();
    }


    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void info(LogCategory category, String action, Long userId, String userEmail,
                     String entityType, String entityId, String details) {
        persist(PlatformLog.builder()
                .level(LogLevel.INFO)
                .category(category)
                .action(action)
                .userId(userId)
                .userEmail(userEmail)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .success(true)
                .build());
    }

    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void warn(LogCategory category, String action, Long userId, String userEmail,
                     String entityType, String entityId, String details) {
        persist(PlatformLog.builder()
                .level(LogLevel.WARN)
                .category(category)
                .action(action)
                .userId(userId)
                .userEmail(userEmail)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .success(false)
                .build());
    }

    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void error(LogCategory category, String action, Long userId, String userEmail,
                      String entityType, String entityId, String details, String errorMessage) {
        persist(PlatformLog.builder()
                .level(LogLevel.ERROR)
                .category(category)
                .action(action)
                .userId(userId)
                .userEmail(userEmail)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .errorMessage(errorMessage)
                .success(false)
                .build());
    }

    
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logRequest(LogLevel level, LogCategory category, String action,
                           Long userId, String userEmail,
                           String httpMethod, String requestPath,
                           String ipAddress, String userAgent,
                           long durationMs, boolean success,
                           String details, String errorMessage) {
        persist(PlatformLog.builder()
                .level(level)
                .category(category)
                .action(action)
                .userId(userId)
                .userEmail(userEmail)
                .httpMethod(httpMethod)
                .requestPath(requestPath)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .durationMs(durationMs)
                .success(success)
                .details(details)
                .errorMessage(errorMessage)
                .build());
    }


    @Transactional(readOnly = true)
    public Page<PlatformLogResponse> findLogs(
            LogLevel level, LogCategory category, Long userId,
            Boolean success, LocalDateTime from, LocalDateTime to,
            String search, Pageable pageable) {

        return logRepository
                .findFiltered(level, category, userId, success, from, to, search, pageable)
                .map(PlatformLogResponse::from);
    }

    @Transactional(readOnly = true)
    public PlatformLogResponse findById(Long id) {
        return logRepository.findById(id)
                .map(PlatformLogResponse::from)
                .orElseThrow(() -> new com.digitalseal.exception.ResourceNotFoundException("Log entry not found"));
    }

    
    @Transactional(readOnly = true)
    public Map<String, Object> getStats(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("windowHours", hours);
        stats.put("since", since);

        Map<String, Long> byLevel = new HashMap<>();
        for (Object[] row : logRepository.countByLevelSince(since)) {
            byLevel.put(row[0].toString(), (Long) row[1]);
        }
        stats.put("byLevel", byLevel);

        Map<String, Long> byCategory = new HashMap<>();
        for (Object[] row : logRepository.countByCategorySince(since)) {
            byCategory.put(row[0].toString(), (Long) row[1]);
        }
        stats.put("byCategory", byCategory);

        Map<String, Long> topErrors = new LinkedHashMap<>();
        for (Object[] row : logRepository.topErrorActionsSince(since)) {
            topErrors.put(row[0].toString(), (Long) row[1]);
        }
        stats.put("topErrorActions", topErrors);

        List<PlatformLogResponse> recentErrors = logRepository
                .findTop20ByLevelOrderByCreatedAtDesc(LogLevel.ERROR)
                .stream()
                .map(PlatformLogResponse::from)
                .toList();
        stats.put("recentErrors", recentErrors);

        return stats;
    }
}
