package com.inventory.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventory.dto.ProductDTO;
import com.inventory.dto.ProductRequest;
import com.inventory.model.Product;
import com.inventory.model.enums.ValuationMethod;
import com.inventory.repository.CategoryRepository;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.SupplierRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final SupplierRepository supplierRepo;
    private final AuditLogWriterService auditLogWriterService;

    public List<ProductDTO> getAllProducts() {
        return productRepo.findByIsActiveTrue().stream().map(this::toDTO).toList();
    }

    public ProductDTO getById(Long id) {
        return productRepo.findById(id).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public ProductDTO getByBarcode(String barcode) {
        return productRepo.findByBarcode(barcode).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Product not found for barcode: " + barcode));
    }

    public List<ProductDTO> getLowStock() {
        return productRepo.findLowStockProducts().stream().map(this::toDTO).toList();
    }

    @Transactional
    public ProductDTO create(ProductRequest req) {
        Product product = Product.builder()
                .name(req.getName()).sku(req.getSku()).barcode(req.getBarcode())
                .description(req.getDescription())
            .imageUrl(req.getImageUrl())
                .unitPrice(req.getUnitPrice()).costPrice(req.getCostPrice())
                .quantityOnHand(req.getQuantityOnHand() != null ? req.getQuantityOnHand() : 0)
                .reorderLevel(req.getReorderLevel() != null ? req.getReorderLevel() : 10)
                .reorderQuantity(req.getReorderQuantity() != null ? req.getReorderQuantity() : 50)
                .valuationMethod(req.getValuationMethod() != null ?
                        ValuationMethod.valueOf(req.getValuationMethod()) : ValuationMethod.FIFO)
                .location(req.getLocation())
                .build();
        if (req.getCategoryId() != null)
            product.setCategory(categoryRepo.findById(req.getCategoryId()).orElse(null));
        if (req.getSupplierId() != null)
            product.setSupplier(supplierRepo.findById(req.getSupplierId()).orElse(null));
        Product saved = productRepo.save(product);
        auditLogWriterService.log(
                "CREATE_PRODUCT",
                "PRODUCT",
                saved.getId(),
                null,
                "name=" + saved.getName() + ", sku=" + saved.getSku() + ", qty=" + saved.getQuantityOnHand());
        return toDTO(saved);
    }

    @Transactional
    public ProductDTO update(Long id, ProductRequest req) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        String oldSnapshot = "name=" + product.getName()
            + ", unitPrice=" + product.getUnitPrice()
            + ", costPrice=" + product.getCostPrice()
            + ", qty=" + product.getQuantityOnHand();
        if (req.getName() != null) product.setName(req.getName());
        if (req.getUnitPrice() != null) product.setUnitPrice(req.getUnitPrice());
        if (req.getCostPrice() != null) product.setCostPrice(req.getCostPrice());
        if (req.getReorderLevel() != null) product.setReorderLevel(req.getReorderLevel());
        if (req.getReorderQuantity() != null) product.setReorderQuantity(req.getReorderQuantity());
        if (req.getLocation() != null) product.setLocation(req.getLocation());
        if (req.getImageUrl() != null) product.setImageUrl(req.getImageUrl());
        if (req.getCategoryId() != null)
            product.setCategory(categoryRepo.findById(req.getCategoryId()).orElse(null));
        if (req.getSupplierId() != null)
            product.setSupplier(supplierRepo.findById(req.getSupplierId()).orElse(null));
        Product saved = productRepo.save(product);
        String newSnapshot = "name=" + saved.getName()
                + ", unitPrice=" + saved.getUnitPrice()
                + ", costPrice=" + saved.getCostPrice()
                + ", qty=" + saved.getQuantityOnHand();
        auditLogWriterService.log("UPDATE_PRODUCT", "PRODUCT", saved.getId(), oldSnapshot, newSnapshot);
        return toDTO(saved);
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        product.setIsActive(false);
        productRepo.save(product);
        auditLogWriterService.log(
            "DELETE_PRODUCT",
            "PRODUCT",
            product.getId(),
            "name=" + product.getName() + ", isActive=true",
            "name=" + product.getName() + ", isActive=false");
    }

    public ProductDTO toDTO(Product p) {
        return ProductDTO.builder()
                .id(p.getId()).name(p.getName()).sku(p.getSku()).barcode(p.getBarcode())
                .description(p.getDescription())
                .imageUrl(p.getImageUrl())
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .supplierId(p.getSupplier() != null ? p.getSupplier().getId() : null)
                .supplierName(p.getSupplier() != null ? p.getSupplier().getName() : null)
                .unitPrice(p.getUnitPrice()).costPrice(p.getCostPrice())
                .quantityOnHand(p.getQuantityOnHand())
                .reorderLevel(p.getReorderLevel()).reorderQuantity(p.getReorderQuantity())
                .valuationMethod(p.getValuationMethod().name())
                .location(p.getLocation()).isActive(p.getIsActive())
                .isLowStock(p.getQuantityOnHand() <= p.getReorderLevel())
                .createdAt(p.getCreatedAt()).build();
    }

    @Transactional
    public ProductDTO updateByQr(String qr, ProductRequest req) {
        Product product = productRepo.findBySkuIgnoreCase(qr)
                .orElseThrow(() -> new RuntimeException("Product not found" + qr));
        String oldSnapshot = "name=" + product.getName()
                + ", unitPrice=" + product.getUnitPrice()
                + ", costPrice=" + product.getCostPrice()
                + ", qty=" + product.getQuantityOnHand();

        if (req.getQuantityOnHand() != null) {
            // If you want to ADD to existing stock:
            product.setQuantityOnHand(product.getQuantityOnHand() + req.getQuantityOnHand());
            // OR if you want to OVERWRITE with the new value:
            // product.setQuantityOnHand(req.getQuantityOnHand());
        }

        if (req.getName() != null) product.setName(req.getName());
        if (req.getUnitPrice() != null) product.setUnitPrice(req.getUnitPrice());
        if (req.getCostPrice() != null) product.setCostPrice(req.getCostPrice());
        if (req.getReorderLevel() != null) product.setReorderLevel(req.getReorderLevel());
        if (req.getReorderQuantity() != null) product.setReorderQuantity(req.getReorderQuantity());
        if (req.getLocation() != null) product.setLocation(req.getLocation());
        if (req.getImageUrl() != null) product.setImageUrl(req.getImageUrl());
        if (req.getCategoryId() != null)
            product.setCategory(categoryRepo.findById(req.getCategoryId()).orElse(null));
        if (req.getSupplierId() != null)
            product.setSupplier(supplierRepo.findById(req.getSupplierId()).orElse(null));
        Product saved = productRepo.save(product);
        String newSnapshot = "name=" + saved.getName()
                + ", unitPrice=" + saved.getUnitPrice()
                + ", costPrice=" + saved.getCostPrice()
                + ", qty=" + saved.getQuantityOnHand();
        auditLogWriterService.log("UPDATE_PRODUCT", "PRODUCT", saved.getId(), oldSnapshot, newSnapshot);
        return toDTO(saved);
    }

}
