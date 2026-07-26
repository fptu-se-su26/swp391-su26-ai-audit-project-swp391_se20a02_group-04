import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";
import { getCatalogServices, saveDiagnosis } from "../../../services/staffAppointmentApi";

const QUOTE_CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả (trừ rửa xe)" },
  { value: "REPAIR", label: "Sửa chữa" },
  { value: "MAINTENANCE", label: "Bảo dưỡng" },
  { value: "INSPECTION", label: "Kiểm tra" },
  { value: "BRAKE", label: "Phanh" },
  { value: "LUBRICANT", label: "Nhớt / dung dịch" },
  { value: "TIRE_WHEEL", label: "Lốp / bánh" },
  { value: "ELECTRICAL", label: "Điện / ắc quy" },
  { value: "ENGINE_TRANSMISSION", label: "Động cơ / truyền động" },
  { value: "SUSPENSION_FRAME", label: "Khung / phuộc" },
  { value: "EMERGENCY", label: "Cứu hộ" },
];

const PRICE_TYPE_LABEL = {
  FIXED: "Giá cố định",
  FROM: "Giá từ",
  QUOTE: "Giá gợi ý",
};

function rankSuggestion(service, keyword) {
  if (!keyword) return 0;
  const haystack = [service.service_name, service.description, service.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tokens = keyword
    .toLowerCase()
    .split(/[\s,/·\-]+/)
    .filter((token) => token.length > 1);
  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

export default function Step1Diagnosis({ job, onChanged, readOnly = false }) {
  const isRepair = job.serviceType === "REPAIR" || job.needsLaborQuote;
  const issueHint = job.issue || job.service || "";

  const [notes, setNotes] = useState(job.diagnosisNotes || "");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setNotes(job.diagnosisNotes || "");
    const nextQuote =
      job.raw?.service?.estimated_price !== null && job.raw?.service?.estimated_price !== undefined
        ? String(job.raw.service.estimated_price)
        : "";
    setQuotedPrice(nextQuote);
  }, [job.diagnosisNotes, job.raw?.service?.estimated_price]);

  const loadCatalog = async (nextCategory = category) => {
    setLoadingCatalog(true);
    try {
      const params = { limit: 100, sort_by: "service_name", sort_order: "asc" };
      if (nextCategory) params.category = nextCategory;
      const response = await getCatalogServices(params);
      const services = (response.data?.services || []).filter((service) => {
        if (!service.is_active) return false;
        // Wash is add-on territory; keep quote guide technical.
        if (!nextCategory && String(service.category).toUpperCase() === "WASH_CARE") return false;
        return Number(service.base_price || 0) >= 0;
      });
      setCatalog(services);
    } catch (requestError) {
      setCatalog([]);
      setError(requestError.message || "Không tải được bảng giá gợi ý.");
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadCatalog("");
  }, [job.id]);

  const suggestions = useMemo(() => {
    const keyword = search.trim() || (isRepair ? issueHint : "");
    const filtered = catalog.filter((service) => {
      if (!search.trim()) return true;
      const haystack = [service.service_name, service.description, service.service_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

    return [...filtered].sort((left, right) => {
      const scoreDiff = rankSuggestion(right, keyword) - rankSuggestion(left, keyword);
      if (scoreDiff !== 0) return scoreDiff;
      return String(left.service_name || "").localeCompare(String(right.service_name || ""), "vi");
    });
  }, [catalog, search, issueHint, isRepair]);

  const applySuggestion = (service) => {
    setSelectedQuoteId(service._id);
    setQuotedPrice(String(Number(service.base_price) || 0));
    setMessage(`Đã chọn gợi ý: ${service.service_name} · ${formatCurrency(service.base_price)}`);
    if (!notes.trim()) {
      setNotes(`Báo giá theo: ${service.service_name}.`);
    }
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    loadCatalog(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!notes.trim()) {
      setError("Vui lòng nhập kết quả kiểm tra.");
      return;
    }

    if (isRepair) {
      const amount = Number(quotedPrice);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Chọn gợi ý hoặc nhập báo giá công (số tiền ≥ 0).");
        return;
      }
    }

    setSaving(true);
    try {
      const quoteValue = quotedPrice === "" ? undefined : Number(quotedPrice);
      await saveDiagnosis(getJobRouteId(job), notes.trim(), quoteValue);
      setMessage(
        quoteValue !== undefined
          ? `Đã lưu kiểm tra và báo giá công ${formatCurrency(quoteValue)}.`
          : "Đã lưu kết quả kiểm tra."
      );
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể lưu kết quả kiểm tra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading">
        <Icon name="fact_check" />
        <div>
          <h3>Kiểm tra và chẩn đoán</h3>
          <p>
            {isRepair
              ? "Chọn gợi ý từ bảng giá dịch vụ hoặc nhập tay báo giá công sau khi kiểm tra."
              : "Ghi nhận tình trạng xe. Có thể chọn gợi ý nếu cần điều chỉnh công."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          disabled={readOnly}
          maxLength="2000"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ví dụ: Kiểm tra sên nhông, bố thắng mòn, đề xuất thay..."
          value={notes}
        />
        <p className="workflow-counter">{notes.length}/2000 ký tự</p>

        <div className="quote-guide-section">
          <div className="repair-head">
            <div>
              <h4>Gợi ý báo giá (danh mục dịch vụ)</h4>
              <p className="muted-copy">
                Dùng lại bảng giá garage — chỉ tham khảo, vẫn sửa được số tiền trước khi lưu.
                {isRepair && issueHint ? (
                  <>
                    {" "}
                    Gợi ý ưu tiên theo lỗi khách chọn: <strong>{issueHint}</strong>.
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="repair-filter-bar">
            <label className="repair-search-field">
              <Icon name="search" />
              <input
                disabled={readOnly}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm dịch vụ gợi ý..."
                value={search}
              />
            </label>
            <label className="repair-category-field">
              <select
                disabled={readOnly || loadingCatalog}
                onChange={(event) => handleCategoryChange(event.target.value)}
                value={category}
              >
                {QUOTE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadingCatalog ? (
            <p className="muted-copy">Đang tải bảng giá...</p>
          ) : suggestions.length === 0 ? (
            <div className="repair-empty compact">
              <strong>Không có gợi ý phù hợp</strong>
              <p>Đổi danh mục / tìm kiếm, hoặc nhập trực tiếp số tiền bên dưới.</p>
            </div>
          ) : (
            <div className="repair-list quote-suggest-list">
              <div className="repair-list-head">
                <span>Dịch vụ gợi ý</span>
                <span>Giá tham khảo</span>
                <span>Chọn</span>
              </div>
              {suggestions.slice(0, 40).map((service) => {
                const selected = selectedQuoteId === service._id;
                return (
                  <div className={`repair-list-row ${selected ? "selected" : ""}`} key={service._id}>
                    <div className="repair-list-info">
                      <strong>{service.service_name}</strong>
                      <small>
                        {service.category}
                        {service.price_type ? ` · ${PRICE_TYPE_LABEL[service.price_type] || service.price_type}` : ""}
                        {service.estimated_duration ? ` · ${service.estimated_duration} phút` : ""}
                      </small>
                    </div>
                    <div className="repair-list-stock">
                      <strong>{formatCurrency(service.base_price)}</strong>
                      <small>tham khảo</small>
                    </div>
                    <button
                      className="secondary-button quote-pick-btn"
                      disabled={readOnly || saving}
                      onClick={() => applySuggestion(service)}
                      type="button"
                    >
                      {selected ? "Đã chọn" : "Dùng giá này"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label className="contact-notes-label" htmlFor="quoted-labor-price">
          Báo giá công dịch vụ {isRepair ? "(bắt buộc)" : "(tuỳ chọn)"}
        </label>
        <input
          className="workflow-search"
          disabled={readOnly}
          id="quoted-labor-price"
          min="0"
          onChange={(event) => {
            setQuotedPrice(event.target.value);
            setSelectedQuoteId("");
          }}
          placeholder={isRepair ? "Chọn gợi ý hoặc nhập tay, VD: 160000" : "Để trống nếu giữ giá gói đã đặt"}
          step="1000"
          type="number"
          value={quotedPrice}
        />
        {isRepair && (
          <p className="muted-copy">
            Số này sẽ hiện thành dòng <strong>Công dịch vụ</strong> trên bill (không phải giá lúc đặt lịch).
          </p>
        )}

        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}
        {!readOnly && (
          <div className="form-actions">
            <button className="primary-button" disabled={saving} type="submit">
              <Icon name="save" />
              {saving ? "Đang lưu..." : "Lưu kiểm tra"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
