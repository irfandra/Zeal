package com.digitalseal.dto.response;

import com.digitalseal.model.entity.CollectionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Collection information response")
public class CollectionResponse {
    
    @Schema(description = "Collection ID", example = "1")
    private Long id;
    
    @Schema(description = "Brand ID", example = "1")
    private Long brandId;
    
    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;

    @Schema(description = "Brand logo URL", example = "https://example.com/logo.png")
    private String brandLogo;
    
    @Schema(description = "Collection name", example = "Spring 2026 Collection")
    private String collectionName;
    
    @Schema(description = "Collection description", example = "Our exclusive spring lineup")
    private String description;
    
    @Schema(description = "Collection image URL", example = "https://example.com/collection.png")
    private String imageUrl;
    
    @Schema(description = "Season identifier", example = "Spring 2026")
    private String season;
    
    @Schema(description = "Whether this is a limited edition", example = "false")
    private Boolean isLimitedEdition;
    
    @Schema(description = "Release date", example = "2026-04-01")
    private LocalDate releaseDate;

    @Schema(description = "Collection lifecycle status", example = "LISTED")
    private CollectionStatus status;

    @Schema(description = "Collection tag shown in card", example = "Rare")
    private String tag;

    @Schema(description = "Sales end datetime. Nullable when presale is not opened.", example = "2026-05-15T23:59:59")
    private LocalDateTime salesEndAt;

    @Schema(description = "Tag background color", example = "#111")
    private String tagColor;

    @Schema(description = "Tag text color", example = "#fff")
    private String tagTextColor;
    
    @Schema(description = "Number of products in this collection", example = "5")
    private Long productCount;

    @Schema(description = "UI-friendly alias of productCount", example = "5")
    private Long itemsCount;
    
    @Schema(description = "Creation timestamp", example = "2026-03-01T10:30:00")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last update timestamp", example = "2026-03-01T15:45:30")
    private LocalDateTime updatedAt;
}
