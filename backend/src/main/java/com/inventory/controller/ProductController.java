package com.inventory.controller;
import java.io.Console;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.inventory.dto.ProductDTO;
import com.inventory.dto.ProductRequest;
import com.inventory.service.BarcodeService;
import com.inventory.service.FileStorageService;
import com.inventory.service.ProductService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final BarcodeService barcodeService;
    private final FileStorageService fileStorageService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<List<ProductDTO>> getAll() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<ProductDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @GetMapping("/barcode/{barcode}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<ProductDTO> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(productService.getByBarcode(barcode));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<ProductDTO>> getLowStock() {
        return ResponseEntity.ok(productService.getLowStock());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ProductDTO> create(@RequestBody ProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ProductDTO> update(@PathVariable Long id, @RequestBody ProductRequest req) {
        return ResponseEntity.ok(productService.update(id, req));
    }

//    @PutMapping("/barcode/{barcode}")
//    @PreAuthorize("hasAnyRole('ADMIN','MANAGER', 'EMPLOYEE')")
//    public ResponseEntity<ProductDTO> updateByBarcode(@PathVariable String barcode, @RequestBody ProductRequest req) {
//        // You'll need to add findByBarcode to your Service
//        return ResponseEntity.ok(productService.updateByBarcode(barcode, req));
//    }

    @PutMapping("/barcode/{qr}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ProductDTO> updateByQr(@PathVariable String qr, @RequestBody ProductRequest req) {
        // You'll need to add findByQr to your Service
        System.out.println(qr);
        return ResponseEntity.ok(productService.updateByQr(qr, req));
    }


    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestPart("file") MultipartFile file) {
        String imageUrl = fileStorageService.saveProductImage(file);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/barcode")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<Map<String, String>> getBarcode(@PathVariable Long id) {
//        System.out.println(id);
        ProductDTO product = productService.getById(id);
        String barcode = barcodeService.generateBarcodeBase64(product.getBarcode());
//        System.out.println(barcode);
        String qr = barcodeService.generateQRCodeBase64(product.getSku());
//        System.out.println(qr);
        return ResponseEntity.ok(Map.of("barcode", barcode, "qrCode", qr));
    }
}
