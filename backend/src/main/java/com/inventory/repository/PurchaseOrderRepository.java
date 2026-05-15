package com.inventory.repository;
import com.inventory.model.PurchaseOrder;
import com.inventory.model.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByStatus(OrderStatus status);
    List<PurchaseOrder> findByCreatedById(Long userId);
    List<PurchaseOrder> findBySupplierId(Long supplierId);
}
