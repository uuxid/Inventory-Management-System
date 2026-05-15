# Implementation Details of Modules

## 1. System Architecture

The system is implemented as a full-stack application with:

- Backend: Spring Boot (Java)
- Frontend: React (JavaScript)
- Database: PostgreSQL (Docker)
- Cache/auxiliary: Redis (Docker)
- Authentication: JWT-based stateless auth

High-level flow:

1. Frontend calls backend REST APIs through frontend/src/services/api.js.
2. Backend controllers validate/authenticate requests and delegate to services.
3. Services apply business rules and use repositories for persistence.
4. Results are returned as DTOs/maps and rendered in frontend pages.

## 2. Backend Module Details

### 2.1 Entry and Configuration Module

Primary classes:

- com.inventory.InventoryApplication
  - Spring Boot application bootstrap.

- com.inventory.config.SecurityConfig
  - filterChain(HttpSecurity, JwtAuthFilter): defines stateless security, protected routes, and JWT filter placement.
  - userDetailsService(): loads users from UserRepository.
  - authenticationProvider(): configures DaoAuthenticationProvider + BCrypt.
  - authenticationManager(AuthenticationConfiguration): exposes AuthenticationManager.
  - passwordEncoder(): BCrypt with strength 12.
  - corsConfigurationSource(): allowed origins/methods/headers.

- com.inventory.config.WebConfig
  - MVC/CORS related web config extension point.

- com.inventory.config.WebSocketConfig
  - WebSocket message broker/stomp endpoint setup.

- com.inventory.config.GlobalExceptionHandler
  - Centralized exception-to-response mapping.

Security behavior:

- /api/auth/** and /ws/** are publicly accessible.
- All other endpoints require JWT authentication.
- Role checks are enforced via @PreAuthorize on sensitive endpoints.

### 2.2 Authentication and User Module

Controller:

- com.inventory.controller.AuthController
  - POST /api/auth/login -> login(LoginRequest)
  - POST /api/auth/users -> createUser(CreateUserRequest)
  - GET /api/auth/users -> getAllUsers()

Service:

- com.inventory.service.AuthService
  - login(LoginRequest): authenticates credentials, builds UserDetails, generates JWT, returns AuthResponse.
  - createUser(CreateUserRequest): uniqueness checks (username/email), hashes password, saves user.
  - getAllUsers(): returns mapped UserDTO list.

Security utility classes:

- com.inventory.security.JwtUtil
  - token generation/validation helpers.

- com.inventory.security.JwtAuthFilter
  - extracts Bearer token, validates JWT, sets Spring Security context.

### 2.3 Product and Supplier Module

Controllers:

- com.inventory.controller.ProductController
  - GET /api/products -> getAll()
  - GET /api/products/{id} -> getById(id)
  - GET /api/products/barcode/{barcode} -> getByBarcode(barcode)
  - GET /api/products/low-stock -> getLowStock()
  - POST /api/products -> create(ProductRequest)
  - PUT /api/products/{id} -> update(id, ProductRequest)
  - POST /api/products/image -> uploadImage(MultipartFile)
  - DELETE /api/products/{id} -> delete(id) (soft-delete behavior via service)
  - GET /api/products/{id}/barcode -> getBarcode(id)

- com.inventory.controller.SupplierController
  - GET /api/suppliers -> getAll()
  - POST /api/suppliers -> create(Supplier)
  - PUT /api/suppliers/{id} -> update(id, Supplier)
  - DELETE /api/suppliers/{id} -> delete(id)

- com.inventory.controller.CategoryController
  - GET /api/categories -> getAll()
  - POST /api/categories -> create(Category)
  - DELETE /api/categories/{id} -> delete(id)

Services:

- com.inventory.service.ProductService
  - getAllProducts(), getById(id), getByBarcode(barcode), getLowStock()
  - create(ProductRequest), update(id, ProductRequest), delete(id)
  - toDTO(Product): maps entity to ProductDTO.

- com.inventory.service.FileStorageService
  - handles image file storage and returns accessible URL path.

- com.inventory.service.BarcodeService
  - barcode generation/encoding utility used by product barcode endpoint.

Key data objects:

- Product, Supplier, Category entities
- ProductRequest, ProductDTO DTOs

### 2.4 Inventory and Stock Movement Module

Controller:

- com.inventory.controller.InventoryController
  - POST /api/inventory/products/{productId}/adjust -> adjust(...)
  - GET /api/inventory/products/{productId}/movements -> getMovements(productId)
  - GET /api/inventory/products/{productId}/valuation/fifo -> getFIFOValue(productId)
  - GET /api/inventory/products/{productId}/eoq -> getEOQ(productId, annualDemand, orderCost, holdingCost)
  - GET /api/inventory/dashboard -> getDashboard()
  - GET /api/inventory/dashboard/received-vs-sold -> getReceivedVsSold(days)

Service:

- com.inventory.service.InventoryService
  - adjustStock(productId, StockAdjustRequest, username)
    - Resolves product + user.
    - Applies stock mutation rules by movement type:
      - IN/RETURN: add quantity
      - OUT/TRANSFER: subtract quantity (with insufficient stock guard)
      - ADJUSTMENT: set exact quantity
    - Saves product quantity and stock movement audit row.
  - getMovementsByProduct(productId): latest movement history.
  - calculateFIFOValue(productId): calculates inventory valuation from IN movements.
  - calculateEOQ(productId, D, S, H): economic order quantity and related costs.
  - getDashboardStats(): totals, low-stock count, inventory value, potential profit/margin.
  - getReceivedVsSold(days): aggregates stock movement IN vs OUT quantities for charting.
  - toDTO(StockMovement): movement response mapping.

Repository algorithm support:

- com.inventory.repository.StockMovementRepository
  - aggregateMovementsByType(since): SQL GROUP BY movement_type for IN/OUT totals.
  - findByProductIdSince(...), findByProductIdOrderByCreatedAtDesc(...)
  - findDailyDemandSince(...): per-day OUT demand points for forecasting.

### 2.5 Purchase Order Module

Controller:

- com.inventory.controller.OrderController
  - GET /api/orders -> getAll(status?)
  - GET /api/orders/{id} -> getById(id)
  - POST /api/orders -> create(CreateOrderRequest)
  - PATCH /api/orders/{id}/approve -> approve(id)
  - PATCH /api/orders/{id}/receive -> receive(id)
  - PATCH /api/orders/{id}/cancel -> cancel(id)

Service:

- com.inventory.service.OrderService
  - createOrder(CreateOrderRequest, username)
    - Validates creator + supplier.
    - Generates order number: PO-yyyyMMdd-counter.
    - Builds OrderItem list, computes total amount.
    - Persists PurchaseOrder in PENDING state.
  - approveOrder(id, username): marks APPROVED with approver user.
  - receiveOrder(id, username):
    - Requires APPROVED status.
    - Increments product stock per item.
    - Writes IN stock movements linked to PO.
    - Marks quantities received and sets RECEIVED status/date.
  - cancelOrder(id): sets CANCELLED.
  - getAllOrders(), getOrdersByStatus(status), getById(id), toDTO(...)

### 2.6 AI Assistant and Alerting Module

Controller:

- com.inventory.controller.AIController
  - POST /api/ai/chat -> chat(AiChatRequest)
  - GET /api/ai/forecast -> forecast()
  - POST /api/ai/generate-alerts -> generateAlerts()
  - GET /api/ai/alerts -> getAlerts()
  - PATCH /api/ai/alerts/{id}/read -> markRead(id)
  - GET /api/ai/alerts/unread-count -> unreadCount()

Service:

- com.inventory.service.AIIntegrationService
  - chat(request, username)
    - Intent routing using keyword/greeting detection.
    - Responds to summary, low stock, supplier priority, availability, profit, forecast, and help.
    - Computes monetary metrics from active products.
  - generateAlerts()
    - Detects low-stock items.
    - Builds severity/title/message.
    - Creates AiAlert rows for admin/manager users.
  - getDemandForecast()
    - Uses TimeGptForecastService first.
    - Falls back to stock-based risk list if external forecast unavailable.
  - suggestCategory(productName, description)
    - Rule-based classification by keyword groups (beverages, grocery, cosmetics, veg, non-veg, dry fruits).

- com.inventory.service.TimeGptForecastService
  - Builds demand forecast summary using daily demand points and external TimeGPT integration.
  - Maintains fallback status for resilience.

- com.inventory.service.AlertScheduler
  - Scheduled trigger for periodic alert generation.

### 2.7 Reporting Module

Controller:

- com.inventory.controller.ReportController
  - GET /api/reports/products/export -> exportProducts()
  - GET /api/reports/stock-movements/export -> exportMovements()

Behavior:

- Produces downloadable report files (byte[] responses) for operational analysis.

### 2.8 Persistence Layer

Repositories:

- ProductRepository, StockMovementRepository, PurchaseOrderRepository,
  SupplierRepository, CategoryRepository, UserRepository,
  AiAlertRepository, AuditLogRepository

Patterns used:

- Spring Data JPA derived queries
- Custom @Query SQL/JPQL for aggregates and analytics

Database migrations:

- backend/src/main/resources/db/migration/V1__initial_schema.sql
- V2..V5 migration files for credentials/data refinement and local staples seed data

## 3. Frontend Module Details

### 3.1 App Shell and Routing

Primary files:

- frontend/src/App.js
  - Route registration and protected route structure.

- frontend/src/components/Layout.js
  - Navigation shell and page layout.

- frontend/src/context/AuthContext.js
  - login(username,password), logout(), role predicates (isAdmin/isManager/isEmployee)
  - Persists token/user in localStorage.

### 3.2 API Client Module

- frontend/src/services/api.js
  - Axios instance with base URL /api and backend proxy.
  - Request interceptor adds Authorization: Bearer <token>.
  - Response interceptor handles 401 by clearing storage and redirecting to /login.

Exported API procedures include:

- Auth: login, getUsers, createUser
- Products: getProducts, getProduct, createProduct, updateProduct, deleteProduct, getLowStock, getProductBarcode, getByBarcode, uploadProductImage
- Inventory: getDashboard, getReceivedVsSold, adjustStock, getMovements, getEOQ
- Orders: getOrders, getOrder, createOrder, approveOrder, receiveOrder, cancelOrder
- Suppliers: getSuppliers, createSupplier, updateSupplier
- AI: aiChat, getForecast, getAlerts, markAlertRead, getUnreadCount

### 3.3 Page Modules

- frontend/src/pages/Login.js
  - Auth form and submit flow.

- frontend/src/pages/Dashboard.js
  - Loads dashboard stats + low stock + orders + alerts + received-vs-sold chart data.
  - Uses Recharts for bar and pie visualizations.

- frontend/src/pages/Products.js
  - Product table, search/filter, add/edit modal, image upload, barcode modal.

- frontend/src/pages/Inventory.js
  - Stock management screen:
    - summary cards via useMemo
    - product filtering/sorting via useMemo
    - movement history filtering
    - stock adjustment form and quick quantity increment buttons

- frontend/src/pages/Orders.js
  - Order creation with line items, approval/receive/cancel controls.

- frontend/src/pages/Suppliers.js
  - Supplier CRUD page.

- frontend/src/pages/Users.js
  - User administration page.

- frontend/src/pages/Reports.js
  - Report export triggers and KPI cards.

- frontend/src/pages/AIAssistant.js
  - Conversational assistant UI, forecast generation trigger, unread alert awareness.

## 4. Core Algorithms and Business Rules

### 4.1 EOQ (Economic Order Quantity)

Implemented in InventoryService.calculateEOQ(...):

- Formula: EOQ = sqrt((2 * D * S) / H)
  - D: annualDemand
  - S: orderCost
  - H: holdingCost
- Derived outputs:
  - ordersPerYear = D / EOQ
  - totalAnnualCost = (S * ordersPerYear) + (H * EOQ / 2)

### 4.2 FIFO Inventory Valuation

Implemented in InventoryService.calculateFIFOValue(...):

- Reads stock movements for a product.
- Starts with current quantity on hand.
- Consumes IN movement layers and sums unit_cost * used_qty until remaining is zero.
- Returns rounded total valuation.

### 4.3 Stock Adjustment State Transition

Implemented in InventoryService.adjustStock(...):

- IN/RETURN -> increment quantity.
- OUT/TRANSFER -> decrement quantity only if sufficient stock.
- ADJUSTMENT -> set absolute quantity.
- Always records a StockMovement audit event.

### 4.4 Received vs Sold Aggregation

Implemented in InventoryService.getReceivedVsSold(days):

- Computes since timestamp = now - days.
- Aggregates movement quantities by movement_type (IN, OUT).
- Maps IN -> received, OUT -> sold.
- Returns period-labeled metrics for dashboard charting.

### 4.5 AI Intent Routing and Rule-Based Decisions

Implemented in AIIntegrationService.chat(...):

- Normalizes message and checks:
  - greeting/help/profit/summary/stock/supplier/product/forecast/thanks
- Builds context-aware response with metrics from active products.
- Falls back to guided prompt if intent is unclear.

### 4.6 Low-Stock Alert Severity Classification

Implemented in AIIntegrationService.determineSeverity(...):

- quantity <= 0 -> CRITICAL
- quantity <= max(1, reorderLevel/2) -> CRITICAL
- else -> WARNING

### 4.7 Rule-Based Product Category Suggestion

Implemented in AIIntegrationService.suggestCategory(...):

- Keyword bucket matching against combined product name + description.
- Returns one of: Beverages, Grocery Items, Cosmetics, Veg Items, Non Veg Items, Dry Fruits.

## 5. Main Procedures and Runtime Workflows

### 5.1 Startup Procedure

Script: start-all.ps1

Sequence:

1. Ensures .env exists (creates from .env.example if needed).
2. Starts Docker services from docker/docker-compose.yml.
3. Waits for database readiness.
4. Starts backend via mvn spring-boot:run.
5. Starts frontend via npm run dev -- --port 3001.

### 5.2 Authentication Procedure

1. User submits login form.
2. Frontend calls POST /api/auth/login.
3. Backend validates credentials and returns JWT + user payload.
4. Frontend stores token/user in localStorage.
5. All subsequent API calls include Bearer token from interceptor.

### 5.3 Product Lifecycle Procedure

1. Product create/update request from Products page.
2. ProductController -> ProductService create/update.
3. Product entity persisted via ProductRepository.
4. DTO returned and table refreshed.

### 5.4 Purchase and Receiving Procedure

1. Order is created (PENDING).
2. Manager approves order (APPROVED).
3. Receiving operation increments stock and writes IN movements.
4. Order transitions to RECEIVED and gets receivedDate.

### 5.5 Inventory Adjustment Procedure

1. User selects product in Inventory page.
2. Submits movement type + quantity + notes/ref.
3. InventoryService applies movement rule and persists movement log.
4. UI refreshes product list and movement history.

### 5.6 AI Alert Procedure

1. Alert generation scans low-stock products.
2. Severity computed per product.
3. Alerts created for admin/manager users.
4. Users fetch unread alerts and mark read.

## 6. Important Data Contracts

Common DTOs and payloads:

- ProductDTO, ProductRequest
- StockMovementDTO, StockAdjustRequest
- OrderDTO, CreateOrderRequest (+ nested OrderItemRequest)
- LoginRequest, AuthResponse, CreateUserRequest, UserDTO
- AiChatRequest

Key enum-driven rules:

- MovementType: IN, OUT, ADJUSTMENT, RETURN, TRANSFER
- OrderStatus: DRAFT, PENDING, APPROVED, ORDERED, RECEIVED, CANCELLED
- Role: ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
- AlertSeverity: INFO, WARNING, CRITICAL
- AlertType includes LOW_STOCK and forecast/reorder related categories

## 7. Summary

This implementation follows a layered architecture:

- Controllers: HTTP contract + auth boundary
- Services: business logic and algorithms
- Repositories: persistence queries and aggregates
- Frontend pages: workflow-specific UI state and API orchestration

The most algorithmic parts are EOQ, FIFO valuation, movement-state transitions, alert severity evaluation, and AI intent routing/fallback.
