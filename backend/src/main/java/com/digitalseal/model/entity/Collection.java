package com.digitalseal.model.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "collections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Collection {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;
    
    @Column(name = "collection_name", nullable = false)
    private String collectionName;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    @Column(name = "season", length = 100)
    private String season;
    
    @Column(name = "is_limited_edition", nullable = false)
    @Builder.Default
    private Boolean isLimitedEdition = false;
    
    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private CollectionStatus status = CollectionStatus.DRAFT;

    @Column(name = "tag", length = 50)
    private String tag;

    @Column(name = "sales_end_at")
    private LocalDateTime salesEndAt;

    @Column(name = "tag_color", length = 20)
    private String tagColor;

    @Column(name = "tag_text_color", length = 20)
    private String tagTextColor;
    
    @Builder.Default
    @OneToMany(mappedBy = "collection", cascade = CascadeType.ALL)
    private List<Product> products = new ArrayList<>();
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
