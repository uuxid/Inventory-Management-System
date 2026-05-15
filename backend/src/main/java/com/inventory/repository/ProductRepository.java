package com.inventory.repository;
import com.inventory.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

//import java.lang.ScopedValue;
import java.util.List;
import java.util.Optional;
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySkuIgnoreCase(String sku);
    Optional<Product> findByBarcode(String barcode);
    List<Product> findByIsActiveTrue();
    @Query("SELECT p FROM Product p WHERE p.quantityOnHand <= p.reorderLevel AND p.isActive = true")
    List<Product> findLowStockProducts();
    List<Product> findByCategoryId(Long categoryId);
    List<Product> findBySupplierId(Long supplierId);

//    <T> ScopedValue<T> findBySkuIgnoreCase(String qr);
}
