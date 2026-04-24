package com.digitalseal.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "brands")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Brand {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "brand_name", nullable = false)
    private String brandName;
    
    @Column(name = "company_email")
    private String companyEmail;
    
    @Column(name = "company_address", columnDefinition = "TEXT")
    private String companyAddress;
    
    @Column(name = "company_wallet_address", unique = true, length = 42)
    private String companyWalletAddress;
    
    @Column(name = "logo", length = 500)
    private String logo;

    @Column(name = "company_banner", length = 500)
    private String companyBanner;

    @Column(name = "statement_letter_url", length = 500)
    private String statementLetterUrl;

    @Column(name = "person_in_charge_name")
    private String personInChargeName;

    @Column(name = "person_in_charge_role")
    private String personInChargeRole;

    @Column(name = "person_in_charge_email")
    private String personInChargeEmail;

    @Column(name = "person_in_charge_phone", length = 30)
    private String personInChargePhone;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "verified", nullable = false)
    @Builder.Default
    private Boolean verified = false;
    
    @Builder.Default
    @OneToMany(mappedBy = "brand", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Collection> collections = new java.util.ArrayList<>();
    
    @Builder.Default
    @OneToMany(mappedBy = "brand", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Product> products = new java.util.ArrayList<>();
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
