package com.digitalseal.repository;

import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.LogLevel;
import com.digitalseal.model.entity.PlatformLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PlatformLogRepository extends JpaRepository<PlatformLog, Long> {


    @Query("SELECT l FROM PlatformLog l WHERE " +
           "(:level    IS NULL OR l.level    = :level)    AND " +
           "(:category IS NULL OR l.category = :category) AND " +
           "(:userId   IS NULL OR l.userId   = :userId)   AND " +
           "(:success  IS NULL OR l.success  = :success)  AND " +
           "(:from     IS NULL OR l.createdAt >= :from)   AND " +
           "(:to       IS NULL OR l.createdAt <= :to)     AND " +
           "(:search   IS NULL OR LOWER(l.action) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "                   OR LOWER(l.details) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "                   OR LOWER(l.userEmail) LIKE LOWER(CONCAT('%',:search,'%'))) " +
           "ORDER BY l.createdAt DESC")
    Page<PlatformLog> findFiltered(
            @Param("level")    LogLevel level,
            @Param("category") LogCategory category,
            @Param("userId")   Long userId,
            @Param("success")  Boolean success,
            @Param("from")     LocalDateTime from,
            @Param("to")       LocalDateTime to,
            @Param("search")   String search,
            Pageable pageable);


    
    @Query("SELECT l.level, COUNT(l) FROM PlatformLog l " +
           "WHERE l.createdAt >= :since GROUP BY l.level")
    List<Object[]> countByLevelSince(@Param("since") LocalDateTime since);

    
    @Query("SELECT l.category, COUNT(l) FROM PlatformLog l " +
           "WHERE l.createdAt >= :since GROUP BY l.category")
    List<Object[]> countByCategorySince(@Param("since") LocalDateTime since);

    
    @Query("SELECT l.action, COUNT(l) FROM PlatformLog l " +
           "WHERE l.level = 'ERROR' AND l.createdAt >= :since " +
           "GROUP BY l.action ORDER BY COUNT(l) DESC")
    List<Object[]> topErrorActionsSince(@Param("since") LocalDateTime since);

    
    long countByUserId(Long userId);

    
    List<PlatformLog> findTop20ByLevelOrderByCreatedAtDesc(LogLevel level);
}
