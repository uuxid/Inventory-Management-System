package com.inventory.controller;
import com.inventory.model.Supplier;
import com.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {
    private final SupplierRepository supplierRepo;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<Supplier>> getAll() {
        return ResponseEntity.ok(supplierRepo.findByIsActiveTrue());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Supplier> create(@RequestBody Supplier supplier) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierRepo.save(supplier));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Supplier> update(@PathVariable Long id, @RequestBody Supplier req) {
        return supplierRepo.findById(id).map(s -> {
            s.setName(req.getName()); s.setEmail(req.getEmail());
            s.setPhone(req.getPhone()); s.setAddress(req.getAddress());
            s.setLeadTimeDays(req.getLeadTimeDays());
            return ResponseEntity.ok(supplierRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierRepo.findById(id).ifPresent(s -> { s.setIsActive(false); supplierRepo.save(s); });
        return ResponseEntity.noContent().build();
    }
}
