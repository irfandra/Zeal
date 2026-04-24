package com.digitalseal.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Standard API response wrapper")
public class ApiResponse<T> {
    @Schema(description = "Whether the request was successful", example = "true")
    private Boolean success;
    
    @Schema(description = "Response payload data")
    private T data;
    
    @Schema(description = "Error details (only present when success is false)")
    private ErrorDetail error;
    
    @Schema(description = "Human-readable message", example = "Operation completed successfully")
    private String message;
    
    @Schema(description = "Response timestamp", example = "2026-02-07T10:30:00")
    private LocalDateTime timestamp;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Error detail information")
    public static class ErrorDetail {
        @Schema(description = "Error code", example = "INVALID_CREDENTIALS")
        private String code;
        
        @Schema(description = "Error message", example = "Invalid email or password")
        private String message;
        
        @Schema(description = "Field that caused the error", example = "email")
        private String field;
        
        @Schema(description = "Additional error details")
        private Object details;
    }
    
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    public static <T> ApiResponse<T> error(String code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorDetail.builder()
                        .code(code)
                        .message(message)
                        .build())
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    public static <T> ApiResponse<T> error(String code, String message, String field) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorDetail.builder()
                        .code(code)
                        .message(message)
                        .field(field)
                        .build())
                .timestamp(LocalDateTime.now())
                .build();
    }
}
