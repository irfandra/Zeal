package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.digitalseal.model.entity.CollectionStatus;
import lombok.Data;

@Data
@Schema(description = "Create collection request payload")
public class CreateCollectionRequest {
    
    @NotBlank(message = "Collection name is required")
    @Size(min = 2, max = 255, message = "Collection name must be between 2 and 255 characters")
    @Schema(description = "Collection name", example = "Spring 2026 Collection")
    private String collectionName;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    @Schema(description = "Collection description", example = "Our exclusive spring lineup")
    private String description;
    
    @Schema(description = "Collection image URL", example = "https://example.com/collection.png")
    private String imageUrl;
    
    @Size(max = 100, message = "Season must not exceed 100 characters")
    @Schema(description = "Season identifier", example = "Spring 2026")
    private String season;
    
    @Schema(description = "Whether this is a limited edition collection", example = "false")
    private Boolean isLimitedEdition;
    
    @Schema(description = "Release date", example = "2026-04-01")
    private LocalDate releaseDate;

    @Schema(description = "Collection lifecycle status", example = "DRAFT")
    private CollectionStatus status;

    @Size(max = 50, message = "Tag must not exceed 50 characters")
    @Schema(description = "Collection tag shown in card", example = "Rare")
    private String tag;

    @Schema(description = "Sales end datetime. Nullable and only set when presale is opened.", example = "2026-05-15T23:59:59")
    private LocalDateTime salesEndAt;

    @Size(max = 20, message = "Tag color must not exceed 20 characters")
    @Schema(description = "Tag background color", example = "#111")
    private String tagColor;

    @Size(max = 20, message = "Tag text color must not exceed 20 characters")
    @Schema(description = "Tag text color", example = "#fff")
    private String tagTextColor;
}
