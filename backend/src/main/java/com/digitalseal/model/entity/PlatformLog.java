package com.digitalseal.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Entity
@Table(name = "platform_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    
    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false, length = 10)
    private LogLevel level;

    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private LogCategory category;

    
    @Column(name = "action", nullable = false, length = 100)
    private String action;


    
    @Column(name = "user_id")
    private Long userId;

    
    @Column(name = "user_email", length = 100)
    private String userEmail;


    
    @Column(name = "entity_type", length = 50)
    private String entityType;

    
    @Column(name = "entity_id", length = 50)
    private String entityId;


    
    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;


    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "request_path", length = 500)
    private String requestPath;


    
    @Column(name = "duration_ms")
    private Long durationMs;

    
    @Column(name = "success", nullable = false)
    @Builder.Default
    private Boolean success = true;
}
