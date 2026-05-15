package com.inventory.repository;
import com.inventory.model.AiAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AiAlertRepository extends JpaRepository<AiAlert, Long> {
    List<AiAlert> findByCreatedForIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);
    List<AiAlert> findByCreatedForIdOrderByCreatedAtDesc(Long userId);
    long countByCreatedForIdAndIsReadFalse(Long userId);
}
