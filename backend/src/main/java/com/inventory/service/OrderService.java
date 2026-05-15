package com.inventory.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventory.dto.CreateOrderRequest;
import com.inventory.dto.OrderDTO;
import com.inventory.model.OrderItem;
import com.inventory.model.Product;
import com.inventory.model.PurchaseOrder;
import com.inventory.model.StockMovement;
import com.inventory.model.Supplier;
import com.inventory.model.User;
import com.inventory.model.enums.MovementType;
import com.inventory.model.enums.OrderStatus;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.PurchaseOrderRepository;
import com.inventory.repository.StockMovementRepository;
import com.inventory.repository.SupplierRepository;
import com.inventory.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final PurchaseOrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final SupplierRepository supplierRepo;
    private final UserRepository userRepo;
    private final StockMovementRepository movementRepo;
        private final AuditLogWriterService auditLogWriterService;
    private static final AtomicInteger counter = new AtomicInteger(1000);

    @Transactional
    public OrderDTO createOrder(CreateOrderRequest req, String username) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Supplier supplier = supplierRepo.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        PurchaseOrder order = PurchaseOrder.builder()
                .orderNo("PO-" + DateTimeFormatter.ofPattern("yyyyMMdd")
                        .format(LocalDate.now()) + "-" + counter.incrementAndGet())
                .supplier(supplier).createdBy(user)
                .status(OrderStatus.PENDING)
                .expectedDate(req.getExpectedDate())
                .notes(req.getNotes())
                .build();

        List<OrderItem> items = req.getItems().stream().map(i -> {
            Product p = productRepo.findById(i.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + i.getProductId()));
            return OrderItem.builder()
                    .purchaseOrder(order).product(p)
                    .quantityOrdered(i.getQuantity())
                    .unitCost(i.getUnitCost())
                    .build();
        }).collect(Collectors.toList());

        order.setItems(items);
        BigDecimal total = items.stream()
                .map(i -> i.getUnitCost().multiply(BigDecimal.valueOf(i.getQuantityOrdered())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(total);

        PurchaseOrder saved = orderRepo.save(order);
        auditLogWriterService.logByUsername(
                username,
                "CREATE_ORDER",
                "ORDER",
                saved.getId(),
                null,
                "orderNo=" + saved.getOrderNo() + ", totalAmount=" + saved.getTotalAmount());
        return toDTO(saved);
    }

    @Transactional
    public OrderDTO approveOrder(Long id, String username) {
        PurchaseOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        User approver = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String oldStatus = order.getStatus().name();
        order.setStatus(OrderStatus.APPROVED);
        order.setApprovedBy(approver);
        PurchaseOrder saved = orderRepo.save(order);
        auditLogWriterService.logByUsername(
                username,
                "APPROVE_ORDER",
                "ORDER",
                saved.getId(),
                "status=" + oldStatus,
                "status=" + saved.getStatus().name());
        return toDTO(saved);
    }

    @Transactional
    public OrderDTO receiveOrder(Long id, String username) {
        PurchaseOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (order.getStatus() != OrderStatus.APPROVED)
            throw new RuntimeException("Order must be approved before receiving");

        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update stock for each item
        order.getItems().forEach(item -> {
            Product product = item.getProduct();
            product.setQuantityOnHand(product.getQuantityOnHand() + item.getQuantityOrdered());
            productRepo.save(product);
            movementRepo.save(StockMovement.builder()
                    .product(product).user(user)
                    .movementType(MovementType.IN)
                    .quantity(item.getQuantityOrdered())
                    .unitCost(item.getUnitCost())
                    .referenceNo(order.getOrderNo())
                    .notes("Received from PO: " + order.getOrderNo())
                    .build());
            item.setQuantityReceived(item.getQuantityOrdered());
        });

        String oldStatus = order.getStatus().name();
        order.setStatus(OrderStatus.RECEIVED);
        order.setReceivedDate(LocalDate.now());
        PurchaseOrder saved = orderRepo.save(order);
        auditLogWriterService.logByUsername(
                username,
                "RECEIVE_ORDER",
                "ORDER",
                saved.getId(),
                "status=" + oldStatus,
                "status=" + saved.getStatus().name() + ", receivedDate=" + saved.getReceivedDate());
        return toDTO(saved);
    }

    @Transactional
        public OrderDTO cancelOrder(Long id, String username) {
        PurchaseOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
                String oldStatus = order.getStatus().name();
        order.setStatus(OrderStatus.CANCELLED);
                PurchaseOrder saved = orderRepo.save(order);
                auditLogWriterService.logByUsername(
                                username,
                                "CANCEL_ORDER",
                                "ORDER",
                                saved.getId(),
                                "status=" + oldStatus,
                                "status=" + saved.getStatus().name());
                return toDTO(saved);
    }

    public List<OrderDTO> getAllOrders() {
        return orderRepo.findAll().stream().map(this::toDTO).toList();
    }

    public List<OrderDTO> getOrdersByStatus(String status) {
        return orderRepo.findByStatus(OrderStatus.valueOf(status))
                .stream().map(this::toDTO).toList();
    }

    public OrderDTO getById(Long id) {
        return orderRepo.findById(id).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    private OrderDTO toDTO(PurchaseOrder o) {
        return OrderDTO.builder()
                .id(o.getId()).orderNo(o.getOrderNo())
                .supplierId(o.getSupplier().getId())
                .supplierName(o.getSupplier().getName())
                .createdByUsername(o.getCreatedBy().getUsername())
                .approvedByUsername(o.getApprovedBy() != null ? o.getApprovedBy().getUsername() : null)
                .status(o.getStatus().name())
                .totalAmount(o.getTotalAmount())
                .notes(o.getNotes())
                .expectedDate(o.getExpectedDate())
                .receivedDate(o.getReceivedDate())
                .createdAt(o.getCreatedAt())
                .itemCount(o.getItems() != null ? o.getItems().size() : 0)
                .build();
    }
}
