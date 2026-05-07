package com.inventory.repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.inventory.model.StockMovement;
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    interface DailyDemandPoint {
        LocalDate getDay();
        Long getQuantity();
    }

    List<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId);

    @Query("SELECT sm FROM StockMovement sm WHERE sm.product.id = :productId AND sm.createdAt >= :since ORDER BY sm.createdAt ASC")
    List<StockMovement> findByProductIdSince(@Param("productId") Long productId, @Param("since") LocalDateTime since);

    @Query(value = """
          SELECT DATE(sm.created_at) AS day, CAST(SUM(sm.quantity) AS bigint) AS quantity
            FROM stock_movements sm
            WHERE sm.product_id = :productId
              AND sm.movement_type = 'OUT'
              AND sm.created_at >= :since
            GROUP BY DATE(sm.created_at)
            ORDER BY DATE(sm.created_at)
            """, nativeQuery = true)
    List<DailyDemandPoint> findDailyDemandSince(@Param("productId") Long productId, @Param("since") LocalDateTime since);

    @Query(value = """
            SELECT sm.movement_type, SUM(sm.quantity) as qty FROM stock_movements sm 
          WHERE sm.created_at >= :since 
            GROUP BY sm.movement_type
            """, nativeQuery = true)
    List<Object[]> aggregateMovementsByType(@Param("since") LocalDateTime since);
}
