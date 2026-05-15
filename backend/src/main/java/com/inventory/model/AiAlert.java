package com.inventory.model;
import com.inventory.model.enums.AlertSeverity;
import com.inventory.model.enums.AlertType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name = "ai_alerts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AiAlert {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;
    @Enumerated(EnumType.STRING) private AlertType alertType;
    @Enumerated(EnumType.STRING) @Builder.Default
    private AlertSeverity severity = AlertSeverity.INFO;
    private String title;
    @Column(columnDefinition = "TEXT") private String message;
    @Builder.Default private Boolean isRead = false;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_for")
    private User createdFor;
    @CreationTimestamp private LocalDateTime createdAt;
}
