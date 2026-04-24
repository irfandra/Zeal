package com.digitalseal.repository;

import com.digitalseal.model.entity.OwnershipHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OwnershipHistoryRepository extends JpaRepository<OwnershipHistory, Long> {
    
    List<OwnershipHistory> findByProductItemIdOrderByTransferredAtAsc(Long productItemId);
}
