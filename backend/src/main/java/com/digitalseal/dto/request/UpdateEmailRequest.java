package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Update email request payload")
public class UpdateEmailRequest {
    
    @NotBlank(message = "New email is required")
    @Email(message = "Invalid email format")
    @Schema(description = "New email address", example = "newemail@example.com")
    private String newEmail;
}
