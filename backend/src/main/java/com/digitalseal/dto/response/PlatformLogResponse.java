package com.digitalseal.dto.response;

import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.LogLevel;
import com.digitalseal.model.entity.PlatformLog;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@Schema(description = "A single platform activity log entry")
public class PlatformLogResponse {

    @Schema(example = "1")
    private Long id;

    @Schema(example = "2026-03-04T18:28:08.700")
    private LocalDateTime createdAt;

    @Schema(example = "INFO")
    private LogLevel level;

    @Schema(example = "ORDER")
    private LogCategory category;

    @Schema(example = "ORDER_COMPLETED")
    private String action;

    @Schema(example = "2")
    private Long userId;

    @Schema(example = "buyer@digitalseal.com")
    private String userEmail;

    @Schema(example = "ORDER")
    private String entityType;

    @Schema(example = "1")
    private String entityId;

    @Schema(description = "Human-readable event details or JSON payload")
    private String details;

    @Schema(description = "Error message — only present for ERROR entries")
    private String errorMessage;

    @Schema(example = "127.0.0.1")
    private String ipAddress;

    @Schema(example = "POST")
    private String httpMethod;

    @Schema(example = "/api/v1/claim")
    private String requestPath;

    @Schema(example = "145")
    private Long durationMs;

    @Schema(example = "true")
    private Boolean success;


    public static PlatformLogResponse from(PlatformLog log) {
        return PlatformLogResponse.builder()
                .id(log.getId())
                .createdAt(log.getCreatedAt())
                .level(log.getLevel())
                .category(log.getCategory())
                .action(log.getAction())
                .userId(log.getUserId())
                .userEmail(log.getUserEmail())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .details(log.getDetails())
                .errorMessage(log.getErrorMessage())
                .ipAddress(log.getIpAddress())
                .httpMethod(log.getHttpMethod())
                .requestPath(log.getRequestPath())
                .durationMs(log.getDurationMs())
                .success(log.getSuccess())
                .build();
    }
}
