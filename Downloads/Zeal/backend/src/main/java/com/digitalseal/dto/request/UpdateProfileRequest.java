package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Update profile request payload (first name and last name)")
public class UpdateProfileRequest {
    
    @Size(min = 1, max = 255, message = "First name must be between 1 and 255 characters")
    @Schema(description = "User's first name", example = "John")
    private String firstName;
    
    @Size(min = 1, max = 255, message = "Last name must be between 1 and 255 characters")
    @Schema(description = "User's last name", example = "Doe")
    private String lastName;

    @Size(max = 25, message = "Phone number must be at most 25 characters")
    @Pattern(regexp = "^\\+?[0-9()\\-\\s]*$", message = "Phone number format is invalid")
    @Schema(description = "User's phone number", example = "+628123456789")
    private String phoneNumber;
}
