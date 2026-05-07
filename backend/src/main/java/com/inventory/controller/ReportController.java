package com.inventory.controller;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inventory.model.Product;
import com.inventory.model.StockMovement;
import com.inventory.repository.ProductRepository;
import com.inventory.repository.StockMovementRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ProductRepository productRepo;
    private final StockMovementRepository movementRepo;

    @GetMapping("/products/export")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<byte[]> exportProducts() throws Exception {
        List<Product> products = productRepo.findByIsActiveTrue();
        StringBuilder doc = new StringBuilder();
        doc.append("<html><head><meta charset='UTF-8'/><style>")
                .append("body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111827;}")
                .append("h2{margin:0 0 12px 0;}")
                .append("table{border-collapse:collapse;width:100%;}")
                .append("th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;}")
                .append("th{background:#e2e8f0;font-weight:700;}")
                .append("</style></head><body>")
                .append("<h2>Inventory Products Report</h2>")
                .append("<table><thead><tr>")
                .append("<th>ID</th><th>Name</th><th>SKU</th><th>Barcode</th><th>Category</th><th>Supplier</th>")
                .append("<th>Unit Price</th><th>Cost Price</th><th>Qty on Hand</th><th>Reorder Level</th><th>Location</th><th>Valuation</th>")
                .append("</tr></thead><tbody>");

        for (Product p : products) {
            doc.append("<tr>")
                    .append("<td>").append(p.getId() != null ? p.getId() : "").append("</td>")
                    .append("<td>").append(escapeHtml(p.getName())).append("</td>")
                    .append("<td>").append(escapeHtml(p.getSku())).append("</td>")
                    .append("<td>").append(escapeHtml(p.getBarcode())).append("</td>")
                    .append("<td>").append(escapeHtml(p.getCategory() != null ? p.getCategory().getName() : null)).append("</td>")
                    .append("<td>").append(escapeHtml(p.getSupplier() != null ? p.getSupplier().getName() : null)).append("</td>")
                    .append("<td>").append(p.getUnitPrice() != null ? p.getUnitPrice() : "").append("</td>")
                    .append("<td>").append(p.getCostPrice() != null ? p.getCostPrice() : "").append("</td>")
                    .append("<td>").append(p.getQuantityOnHand() != null ? p.getQuantityOnHand() : "").append("</td>")
                    .append("<td>").append(p.getReorderLevel() != null ? p.getReorderLevel() : "").append("</td>")
                    .append("<td>").append(escapeHtml(p.getLocation())).append("</td>")
                    .append("<td>").append(p.getValuationMethod() != null ? p.getValuationMethod().name() : "").append("</td>")
                    .append("</tr>");
        }

        doc.append("</tbody></table></body></html>");

        HttpHeaders respHeaders = new HttpHeaders();
        respHeaders.setContentType(MediaType.parseMediaType("application/msword; charset=UTF-8"));
        respHeaders.setContentDisposition(ContentDisposition.attachment().filename("products-export.doc").build());

        return ResponseEntity.ok().headers(respHeaders).body(doc.toString().getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/stock-movements/export")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<byte[]> exportMovements() throws Exception {
        List<StockMovement> movements = movementRepo.findAll();

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Stock Movements");

            String[] headers = {"ID","Product","SKU","Type","Quantity","Unit Cost","Reference","Notes","Date"};
            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont(); font.setBold(true);
            headerStyle.setFont(font);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 4000);
            }

            int rowNum = 1;
            for (StockMovement m : movements) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(m.getId());
                row.createCell(1).setCellValue(m.getProduct().getName());
                row.createCell(2).setCellValue(m.getProduct().getSku());
                row.createCell(3).setCellValue(m.getMovementType().name());
                row.createCell(4).setCellValue(m.getQuantity());
                row.createCell(5).setCellValue(m.getUnitCost() != null ? m.getUnitCost().doubleValue() : 0);
                row.createCell(6).setCellValue(m.getReferenceNo() != null ? m.getReferenceNo() : "");
                row.createCell(7).setCellValue(m.getNotes() != null ? m.getNotes() : "");
                row.createCell(8).setCellValue(m.getCreatedAt().toString());
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);

            HttpHeaders respHeaders = new HttpHeaders();
            respHeaders.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            respHeaders.setContentDispositionFormData("attachment", "stock-movements-export.xlsx");

            return ResponseEntity.ok().headers(respHeaders).body(out.toByteArray());
        }
    }

    private String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
