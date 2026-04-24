package com.digitalseal.controller;

import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.PlatformLogResponse;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.LogLevel;
import com.digitalseal.service.PlatformLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/admin/logs")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Platform Logs", description = "Activity log and monitoring endpoints (BRAND / OWNER role required)")
public class PlatformLogController {

    private final PlatformLogService platformLogService;


    @Operation(
        summary = "List platform logs",
        description = "Returns a paginated, filterable list of all platform events. " +
                      "Supports filtering by level (INFO/WARN/ERROR), category, userId, success flag, " +
                      "date range, and a free-text search across action, details, and userEmail fields.")
    @GetMapping
    @PreAuthorize("hasAnyRole('BRAND', 'OWNER')")
    public ResponseEntity<ApiResponse<Page<PlatformLogResponse>>> getLogs(
            @Parameter(description = "Filter by severity: INFO | WARN | ERROR")
            @RequestParam(required = false) LogLevel level,

            @Parameter(description = "Filter by category: AUTH | ORDER | CLAIM | BLOCKCHAIN | PRODUCT | BRAND | USER | WALLET | SYSTEM")
            @RequestParam(required = false) LogCategory category,

            @Parameter(description = "Filter by user ID")
            @RequestParam(required = false) Long userId,

            @Parameter(description = "Filter by outcome: true = success, false = failure")
            @RequestParam(required = false) Boolean success,

            @Parameter(description = "Start of time range (ISO 8601). Example: 2026-03-01T00:00:00")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,

            @Parameter(description = "End of time range (ISO 8601). Example: 2026-03-31T23:59:59")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,

            @Parameter(description = "Free-text search in action, details, userEmail")
            @RequestParam(required = false) String search,

            @Parameter(description = "Zero-based page index")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size (max 200)")
            @RequestParam(defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 200));
        Page<PlatformLogResponse> result =
                platformLogService.findLogs(level, category, userId, success, from, to, search, pageable);

        return ResponseEntity.ok(ApiResponse.success(result, "Logs retrieved"));
    }


    @Operation(summary = "Get a single log entry by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('BRAND', 'OWNER')")
    public ResponseEntity<ApiResponse<PlatformLogResponse>> getLog(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(platformLogService.findById(id), "Log entry retrieved"));
    }


    @Operation(
        summary = "Platform log statistics",
        description = "Dashboard summary: event counts by level and category, top error actions, " +
                      "and the latest 20 error entries — all within the last N hours (default 24).")
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('BRAND', 'OWNER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats(
            @Parameter(description = "Rolling window in hours (default 24)")
            @RequestParam(defaultValue = "24") int hours) {

        Map<String, Object> stats = platformLogService.getStats(hours);
        return ResponseEntity.ok(ApiResponse.success(stats, "Stats retrieved"));
    }


    @Operation(summary = "Recent errors (shortcut)", description = "Latest 20 ERROR-level log entries.")
    @GetMapping("/errors")
    @PreAuthorize("hasAnyRole('BRAND', 'OWNER')")
    public ResponseEntity<ApiResponse<Page<PlatformLogResponse>>> getErrors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<PlatformLogResponse> result =
                platformLogService.findLogs(LogLevel.ERROR, null, null, null, null, null, null, pageable);
        return ResponseEntity.ok(ApiResponse.success(result, "Error logs retrieved"));
    }
}
