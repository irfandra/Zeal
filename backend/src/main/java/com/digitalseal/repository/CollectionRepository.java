package com.digitalseal.repository;

import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.CollectionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, Long> {
    
    List<Collection> findByBrandId(Long brandId);

    List<Collection> findByStatusAndSalesEndAtLessThanEqual(CollectionStatus status, LocalDateTime threshold);
    
    Optional<Collection> findByIdAndBrandId(Long id, Long brandId);
    
    Boolean existsByCollectionNameIgnoreCaseAndBrandId(String collectionName, Long brandId);
}
