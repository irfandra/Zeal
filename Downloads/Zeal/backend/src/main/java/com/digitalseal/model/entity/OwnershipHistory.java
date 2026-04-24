package com.digitalseal.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;


@Entity
@Table(name = "ownership_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class OwnershipHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_item_id", nullable = false)
    private ProductItem productItem;
    
    @Column(name = "from_wallet", length = 42)
    private String fromWallet;
    
    @Column(name = "to_wallet", length = 42)
    private String toWallet;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false, length = 20)
    private TransferType transferType;
    
    @Column(name = "tx_hash", length = 66)
    private String txHash;
    
    @Column(name = "block_number")
    private Long blockNumber;
    
    @Column(name = "notes", length = 500)
    private String notes;
    
    @Column(name = "transferred_at", nullable = false)
    private LocalDateTime transferredAt;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
