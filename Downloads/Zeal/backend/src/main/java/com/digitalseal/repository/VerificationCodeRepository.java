package com.digitalseal.repository;

import com.digitalseal.model.entity.User;
import com.digitalseal.model.entity.VerificationCode;
import com.digitalseal.model.entity.VerificationType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    
    Optional<VerificationCode> findTopByUserAndTypeAndIsUsedFalseOrderByCreatedAtDesc(
            User user, VerificationType type);
    
    @Modifying
    @Query("UPDATE VerificationCode vc SET vc.isUsed = true WHERE vc.user = ?1 AND vc.type = ?2 AND vc.isUsed = false")
    void invalidateAllByUserAndType(User user, VerificationType type);
    
    @Modifying
    @Query("DELETE FROM VerificationCode vc WHERE vc.expiresAt < ?1")
    void deleteExpiredCodes(LocalDateTime now);
}
