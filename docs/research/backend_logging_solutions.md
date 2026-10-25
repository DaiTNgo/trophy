# Nghiên cứu các giải pháp Logging Mã nguồn mở cho Backend

Tài liệu này tổng hợp và đánh giá các giải pháp ghi log (logging) mã nguồn mở hiện đại, phù hợp cho một dự án monorepo sử dụng backend Node.js (Hono) chạy trên môi trường Docker.

## 1. Grafana Loki
- **Nguồn:** [Trang chủ Loki](https://grafana.com/oss/loki/), [GitHub Repo](https://github.com/grafana/loki)
- **Kiến trúc:** Lấy cảm hứng từ Prometheus. Thay vì đánh chỉ mục (index) toàn bộ nội dung text của log, Loki chỉ đánh chỉ mục các nhãn (labels). Nội dung log được nén và lưu trữ thành các chunk trên object storage hoặc file system.
- **Tài nguyên (Resource Usage):** Rất nhẹ và tiết kiệm tài nguyên do không tốn RAM/CPU cho việc index full-text.
- **Cài đặt qua Docker:** Rất dễ dàng. Chỉ cần cấu hình file `docker-compose.yml` với một container `loki` và một log forwarder như `promtail` hoặc dùng trực tiếp Docker Driver của Loki.
- **Tích hợp:** Hoàn hảo với Grafana Dashboard. Thích hợp cho môi trường containerized.

## 2. ELK Stack (Elasticsearch, Logstash, Kibana) / OpenSearch
- **Nguồn:** [Elastic ELK](https://www.elastic.co/elk-stack), [OpenSearch](https://opensearch.org/)
- **Kiến trúc:** Dựa trên cấu trúc inverted index, hỗ trợ tìm kiếm full-text cực kỳ mạnh mẽ. OpenSearch là một nhánh (fork) mã nguồn mở từ Elasticsearch do AWS hỗ trợ.
- **Tài nguyên:** Rất tốn kém (Nặng). Yêu cầu nhiều RAM (do Elasticsearch chạy trên JVM) và CPU để xử lý index dữ liệu liên tục.
- **Cài đặt qua Docker:** Tương đối phức tạp do cần cấu hình tối ưu bộ nhớ (heap size), bảo mật và thiết lập các nodes/clusters.
- **Tích hợp:** Hệ sinh thái lâu đời, có nhiều plugin và thư viện hỗ trợ. Tuy nhiên, kiến trúc này thường quá cồng kềnh cho các dự án vừa và nhỏ.

## 3. SigNoz
- **Nguồn:** [Trang chủ SigNoz](https://signoz.io/), [GitHub Repo](https://github.com/SigNoz/signoz)
- **Kiến trúc:** Xây dựng dựa trên cơ sở dữ liệu ClickHouse ở backend và hỗ trợ native (gốc) cho giao thức OpenTelemetry (OTel). SigNoz không chỉ quản lý log mà còn cung cấp cả Traces và Metrics (APM toàn diện).
- **Tài nguyên:** Trung bình - Cao. ClickHouse xử lý dữ liệu log rất hiệu quả, nhưng việc chạy toàn bộ hệ sinh thái SigNoz (Query service, Frontend, ClickHouse, OTel Collector) vẫn đòi hỏi một lượng tài nguyên nhất định.
- **Cài đặt qua Docker:** SigNoz cung cấp sẵn script cài đặt `docker-compose` khá chuẩn, chạy được ngay lập tức trên 1 máy ảo.
- **Tích hợp:** Tuyệt vời nếu bạn muốn áp dụng chuẩn đo lường OpenTelemetry cho ứng dụng Hono/Node.js của mình.

## 4. Các công cụ Log Forwarding / Data Pipelines: Vector & Fluent Bit
- **Nguồn:** [Vector.dev](https://vector.dev/), [Fluent Bit](https://fluentbit.io/)
- **Kiến trúc:** Đây không phải là nơi *lưu trữ* log, mà là các công cụ trung gian (router/forwarder) để thu thập, biến đổi và gửi log đến các hệ thống lưu trữ (như Loki, ClickHouse, Elasticsearch).
  - **Vector:** Được phát triển bằng Rust, hiệu năng cực cao và an toàn bộ nhớ.
  - **Fluent Bit:** Phát triển bằng C, siêu nhẹ.
- **Tài nguyên:** Cực kỳ thấp.
- **Cài đặt qua Docker:** Dễ cấu hình qua Docker daemon (dùng làm log driver) hoặc chạy dưới dạng một sidecar container.
- **Tích hợp:** Dễ dàng thu thập dữ liệu `stdout`/`stderr` từ các Docker container của backend và linh hoạt gửi đi bất cứ đâu.

## 5. ClickHouse (Tự dựng stack cho Log)
- **Nguồn:** [ClickHouse](https://clickhouse.com/)
- **Kiến trúc:** Cơ sở dữ liệu phân tích dạng cột (OLAP). Xử lý dữ liệu lớn, hỗ trợ chèn (insert) và truy vấn siêu tốc. Được nhiều công ty lớn sử dụng để thay thế ELK stack trong mảng logging.
- **Tài nguyên:** Cần cấu hình phần cứng phù hợp để tối ưu hiệu suất, nhưng tối ưu chi phí hơn ELK ở quy mô lớn.
- **Cài đặt qua Docker:** Cài đặt ClickHouse container rất dễ nhưng đòi hỏi team phải tự thiết kế schema (bảng) để lưu trữ log hiệu quả.
- **Tích hợp:** Cần tự cấu hình một pipeline, ví dụ: `Node.js (Hono) -> Vector / Fluent Bit -> ClickHouse -> Grafana`.

---

## Bảng So sánh Tổng quan

| Tiêu chí | Grafana Loki | ELK / OpenSearch | SigNoz (ClickHouse) |
|----------|--------------|------------------|---------------------|
| **Kiến trúc** | Label-indexed, lưu trữ object/file | Inverted Index, Full-text search | Cột (Columnar), OpenTelemetry native |
| **Tiêu thụ tài nguyên**| Thấp | Rất Cao | Trung bình |
| **Cài đặt Docker** | Rất dễ (Loki + Promtail) | Khó (Cần tune RAM, JVM settings) | Trung bình (dùng cấu hình sẵn script) |
| **Giao diện quản lý** | Grafana Dashboard | Kibana / OpenSearch Dashboards | Bảng điều khiển tích hợp sẵn (SigNoz UI) |
| **Trường hợp khuyên dùng**| Setup nhanh, log đơn giản, tiết kiệm tài nguyên | Phân tích nội dung log siêu phức tạp | Cần giải pháp APM toàn diện (Log, Trace, Metric) |

## Đề xuất cho dự án Node.js (Hono) trong Docker
Dựa trên kiến trúc Docker container của dự án:
1. **Lựa chọn Nhẹ nhàng & Tối ưu nhất:** Sử dụng **Grafana Loki** kết hợp với **Grafana**. Trong Node.js/Hono, bạn chỉ cần in log ra `stdout` (khuyên dùng thư viện `pino` để format chuẩn JSON). Sau đó, dùng plugin Docker Driver của Loki hoặc chạy một container Promtail để tự động đẩy log sang Loki. Hệ thống này tốn rất ít cấu hình và RAM.
2. **Lựa chọn Hiện đại & Toàn diện:** Nếu có nhu cầu giám sát hệ thống sâu hơn (Tracing - theo dõi request qua các API, độ trễ, bottleneck) thay vì chỉ đọc log lỗi, hãy cân nhắc **SigNoz**. Tích hợp OpenTelemetry SDK vào backend Hono sẽ giúp bạn có một giải pháp giám sát ngang ngửa Datadog nhưng hoàn toàn mã nguồn mở.
