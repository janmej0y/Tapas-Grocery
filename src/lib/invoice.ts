import { formatCurrency } from "@/lib/format";
import type { Order } from "@/lib/types";

type InvoiceItem = {
  name: string;
  unit: string;
  quantity: number;
};

export function buildInvoiceText(order: Order) {
  return [
    "Tapas Grocery Store",
    `Invoice: ${order.invoice_number}`,
    `Order: ${order.order_id}`,
    `Date: ${formatDate(order.created_at)}`,
    "",
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Address: ${formatAddress(order)}`,
    `Landmark: ${order.delivery_address.landmark || "Not provided"}`,
    "",
    `Items: ${order.items_ordered}`,
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Discount: ${formatCurrency(order.discount_amount)}`,
    `Delivery: ${formatCurrency(order.delivery_fee)}`,
    `Total: ${formatCurrency(order.total_amount)}`,
    `Payment: ${order.payment_method} (${order.payment_status})`,
    `Status: ${order.status}`,
    `Estimated delivery: ${order.delivery_eta}`
  ].join("\n");
}

export function buildWhatsAppOrderUrl(order: Order) {
  const phone = order.customer_phone.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Your Tapas Grocery Store order ${order.order_id} is confirmed.\nTotal: ${formatCurrency(order.total_amount)}\nStatus: ${order.status}\nEstimated delivery: ${order.delivery_eta}\nInvoice: ${order.invoice_number}`
  );
  return `https://wa.me/91${phone}?text=${message}`;
}

export function downloadInvoice(order: Order) {
  const invoiceWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=1200");

  if (!invoiceWindow) {
    const blob = new Blob([buildInvoiceText(order)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${order.invoice_number}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  invoiceWindow.document.open();
  invoiceWindow.document.write(buildInvoiceHtml(order));
  invoiceWindow.document.close();
  invoiceWindow.focus();
}

export function buildInvoiceHtml(order: Order) {
  const items = parseInvoiceItems(order.items_ordered);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(order.invoice_number)} | Tapas Grocery Store</title>
  <style>
    :root {
      --leaf: #047857;
      --leaf-dark: #064e3b;
      --amber: #f59e0b;
      --ink: #111827;
      --muted: #64748b;
      --line: #dbe3ec;
      --paper: #ffffff;
      --soft: #f8fafc;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e5e7eb;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    .page {
      width: min(880px, calc(100% - 24px));
      margin: 24px auto;
      background: var(--paper);
      border: 1px solid var(--line);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
    }
    .topbar { height: 8px; background: linear-gradient(90deg, var(--leaf), var(--amber)); }
    .content { padding: 34px; }
    .header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: start;
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
    }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--leaf);
      color: white;
      font-size: 26px;
      font-weight: 900;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1; letter-spacing: 0; }
    .subtitle { margin-top: 6px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .invoice-meta {
      min-width: 230px;
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
      text-align: right;
    }
    .invoice-meta .label {
      background: var(--leaf-dark);
      color: white;
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .invoice-meta .value { padding: 12px; font-size: 20px; font-weight: 900; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 22px;
    }
    .box {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 16px;
      background: var(--soft);
      min-height: 132px;
    }
    .box h2 {
      color: var(--leaf-dark);
      font-size: 13px;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0;
    }
    .box p { color: var(--ink); font-size: 14px; font-weight: 700; }
    .muted { color: var(--muted) !important; font-weight: 600 !important; }
    .status-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .pill {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
      background: white;
    }
    .pill span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .pill strong { display: block; margin-top: 4px; font-size: 14px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    thead { background: var(--leaf-dark); color: white; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--line); }
    th { font-size: 12px; text-transform: uppercase; }
    td { font-size: 14px; font-weight: 700; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .right { text-align: right; }
    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: min(360px, 100%);
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 11px 14px;
      border-bottom: 1px solid var(--line);
      font-weight: 800;
    }
    .total-line.final {
      background: var(--leaf-dark);
      color: white;
      font-size: 20px;
      border-bottom: 0;
    }
    .footer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: end;
      margin-top: 26px;
      border-top: 1px solid var(--line);
      padding-top: 18px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .actions {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 34px;
      border-top: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
    }
    button {
      border: 0;
      border-radius: 8px;
      padding: 11px 16px;
      background: var(--leaf);
      color: white;
      font-weight: 900;
      cursor: pointer;
    }
    button.secondary { background: var(--ink); }

    @media (max-width: 700px) {
      .content { padding: 22px; }
      .header, .grid, .status-row, .footer { grid-template-columns: 1fr; }
      .invoice-meta { text-align: left; }
      th:nth-child(3), td:nth-child(3) { display: none; }
    }

    @media print {
      body { background: white; }
      .page { width: 100%; margin: 0; border: 0; box-shadow: none; }
      .actions { display: none; }
      .content { padding: 24px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="topbar"></div>
    <section class="content">
      <header class="header">
        <div class="brand">
          <div class="logo">T</div>
          <div>
            <h1>Tapas Grocery Store</h1>
            <p class="subtitle">Fresh local grocery delivery | Hatimuri, West Bengal</p>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="label">Invoice</div>
          <div class="value">${escapeHtml(order.invoice_number)}</div>
        </div>
      </header>

      <section class="grid">
        <div class="box">
          <h2>Billed To</h2>
          <p>${escapeHtml(order.customer_name)}</p>
          <p class="muted">${escapeHtml(order.customer_phone)}</p>
          <p class="muted">${escapeHtml(formatAddress(order))}</p>
          <p class="muted">Landmark: ${escapeHtml(order.delivery_address.landmark || "Not provided")}</p>
        </div>
        <div class="box">
          <h2>Order Details</h2>
          <p>Order ID: ${escapeHtml(order.order_id)}</p>
          <p class="muted">Date: ${escapeHtml(formatDate(order.created_at))}</p>
          <p class="muted">Distance: ${escapeHtml(String(order.delivery_distance))} km</p>
          <p class="muted">ETA: ${escapeHtml(order.delivery_eta)}</p>
        </div>
      </section>

      <section class="status-row">
        <div class="pill"><span>Payment</span><strong>${escapeHtml(order.payment_method)} - ${escapeHtml(order.payment_status)}</strong></div>
        <div class="pill"><span>Status</span><strong>${escapeHtml(order.status)}</strong></div>
        <div class="pill"><span>Refund</span><strong>${escapeHtml(order.refund_status)}</strong></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th class="right">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.unit)}</td>
              <td class="right">${item.quantity}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <section class="totals">
        <div class="total-line"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div>
        <div class="total-line"><span>Discount</span><strong>${formatCurrency(order.discount_amount)}</strong></div>
        <div class="total-line"><span>Delivery fee</span><strong>${formatCurrency(order.delivery_fee)}</strong></div>
        <div class="total-line final"><span>Total</span><strong>${formatCurrency(order.total_amount)}</strong></div>
      </section>

      <footer class="footer">
        <p>Thank you for shopping with Tapas Grocery Store. Please keep this invoice for order support.</p>
        <p>Generated on ${escapeHtml(formatDate(new Date().toISOString()))}</p>
      </footer>
    </section>
    <div class="actions">
      <button class="secondary" type="button" onclick="window.close()">Close</button>
      <button type="button" onclick="window.print()">Print / Save PDF</button>
    </div>
  </main>
</body>
</html>`;
}

function parseInvoiceItems(itemsOrdered: string): InvoiceItem[] {
  return itemsOrdered
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const withUnit = item.match(/^(.*) \((.*)\) x (\d+)$/);
      const withoutUnit = item.match(/^(.*) x (\d+)$/);

      if (withUnit) {
        return {
          name: withUnit[1],
          unit: withUnit[2],
          quantity: Number(withUnit[3])
        };
      }

      if (withoutUnit) {
        return {
          name: withoutUnit[1],
          unit: "Selected pack",
          quantity: Number(withoutUnit[2])
        };
      }

      return {
        name: item,
        unit: "-",
        quantity: 1
      };
    });
}

function formatAddress(order: Order) {
  return [
    order.delivery_address.line1,
    order.delivery_address.line2,
    order.delivery_address.city,
    `${order.delivery_address.state} - ${order.delivery_address.pincode}`
  ].filter(Boolean).join(", ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
