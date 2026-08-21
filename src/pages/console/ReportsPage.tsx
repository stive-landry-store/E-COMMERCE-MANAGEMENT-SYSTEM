import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Order, StockMovement } from "@/types";

export function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"orders" | "stock">("orders");

  const orders = useQuery({
    queryKey: ["report-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const movements = useQuery({
    queryKey: ["report-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, product_variants(sku, products(name))")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as StockMovement[];
    },
  });

  const filteredOrders = useMemo(() => {
    return (orders.data ?? []).filter((o) => inRange(o.created_at, from, to));
  }, [orders.data, from, to]);

  const filteredMoves = useMemo(() => {
    return (movements.data ?? []).filter((m) => inRange(m.created_at, from, to));
  }, [movements.data, from, to]);

  function exportExcel() {
    if (kind === "orders") {
      const sheet = filteredOrders.map((o) => ({
        number: o.order_number,
        date: o.created_at,
        status: o.order_status,
        payment: o.payment_status,
        total: o.total,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Sales");
      XLSX.writeFile(wb, "ecms-sales.xlsx");
    } else {
      const sheet = filteredMoves.map((m) => ({
        date: m.created_at,
        type: m.type,
        qty: m.quantity,
        reason: m.reason,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Stock");
      XLSX.writeFile(wb, "ecms-stock.xlsx");
    }
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(kind === "orders" ? "Sales & orders report" : "Stock movement report", 14, 18);
    if (kind === "orders") {
      autoTable(doc, {
        startY: 24,
        head: [["Order", "Date", "Status", "Payment", "Total"]],
        body: filteredOrders.map((o) => [
          o.order_number,
          formatDate(o.created_at),
          o.order_status,
          o.payment_status,
          formatMoney(o.total),
        ]),
      });
    } else {
      autoTable(doc, {
        startY: 24,
        head: [["Date", "Type", "Qty", "Reason"]],
        body: filteredMoves.map((m) => [formatDate(m.created_at), m.type, String(m.quantity), m.reason ?? ""]),
      });
    }
    doc.save(kind === "orders" ? "ecms-sales.pdf" : "ecms-stock.pdf");
  }

  if (orders.isLoading || movements.isLoading) return <Spinner />;

  const salesTotal = filteredOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);

  return (
    <div>
      <h1 className="font-display text-3xl">Reports</h1>
      <div className="mt-4 flex flex-wrap gap-3 surface p-4">
        <select value={kind} onChange={(e) => setKind(e.target.value as "orders" | "stock")} className="max-w-xs">
          <option value="orders">Sales / orders</option>
          <option value="stock">Stock movements</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button size="sm" onClick={exportPdf}>
          Export PDF
        </Button>
        <Button size="sm" variant="secondary" onClick={exportExcel}>
          Export Excel
        </Button>
      </div>
      {kind === "orders" ? (
        <p className="mt-4 text-sm">
          {filteredOrders.length} orders · {formatMoney(salesTotal)}
        </p>
      ) : (
        <p className="mt-4 text-sm">{filteredMoves.length} movements</p>
      )}
      <div className="mt-4 overflow-x-auto surface">
        {kind === "orders" ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-ink-700/60">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{o.order_number}</td>
                  <td className="px-3 py-2">{formatDate(o.created_at)}</td>
                  <td className="px-3 py-2">{o.order_status}</td>
                  <td className="px-3 py-2">{o.payment_status}</td>
                  <td className="px-3 py-2">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-ink-700/60">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredMoves.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{formatDate(m.created_at)}</td>
                  <td className="px-3 py-2">{m.type}</td>
                  <td className="px-3 py-2">{m.quantity}</td>
                  <td className="px-3 py-2">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function inRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime() + 86400000) return false;
  return true;
}
