"use client";

import { useRef, useState } from "react";
import { FileDown, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Logo } from "@/components/layout/logo";
import type { ReceiptData } from "@/app/actions/finance";

type Lang = "uz" | "ru" | "en";

const LABELS: Record<Lang, Record<string, string>> = {
  uz: {
    heading: "To'lov cheki",
    receiptNo: "Chek raqami",
    company: "Kompaniya",
    branch: "Filial",
    student: "O'quvchi",
    phone: "Raqam",
    group: "Guruh",
    price: "Kurs narxi",
    teacher: "O'qituvchi",
    type: "Turi",
    amount: "To'lov summasi",
    date: "Sana",
    employee: "Xodim",
    time: "Vaqt",
    print: "Chop etish",
    savePdf: "PDF saqlash",
    saving: "Saqlanmoqda…",
    language: "Til",
  },
  ru: {
    heading: "Чек об оплате",
    receiptNo: "Номер чека",
    company: "Компания",
    branch: "Филиал",
    student: "Ученик",
    phone: "Номер",
    group: "Группа",
    price: "Цена курса",
    teacher: "Учитель",
    type: "Тип",
    amount: "Сумма оплаты",
    date: "Дата",
    employee: "Сотрудник",
    time: "Время",
    print: "Печать",
    savePdf: "Сохранить PDF",
    saving: "Сохранение…",
    language: "Язык",
  },
  en: {
    heading: "Payment receipt",
    receiptNo: "Receipt No",
    company: "Company",
    branch: "Branch",
    student: "Student",
    phone: "Number",
    group: "Group",
    price: "Course price",
    teacher: "Teacher",
    type: "Type",
    amount: "Amount paid",
    date: "Date",
    employee: "Employee",
    time: "Time",
    print: "Print",
    savePdf: "Save as PDF",
    saving: "Saving…",
    language: "Language",
  },
};

const METHOD_LABELS: Record<Lang, Record<string, string>> = {
  uz: { CASH: "Naqd", CLICK: "Click", CARD: "Karta", TRANSFER: "O'tkazma" },
  ru: { CASH: "Наличные", CLICK: "Click", CARD: "Карта", TRANSFER: "Перевод" },
  en: { CASH: "Cash", CLICK: "Click", CARD: "Card", TRANSFER: "Transfer" },
};

function intlLocale(lang: Lang) {
  return lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US";
}

function money(n: number, lang: Lang) {
  const grouped = new Intl.NumberFormat(intlLocale(lang)).format(Math.round(n));
  const suffix = lang === "ru" ? "сум" : "so'm";
  return `${grouped} ${suffix}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="font-semibold text-slate-900">{label}:</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}

export function PaymentReceipt({
  data,
  defaultLang = "ru",
  onClose,
}: {
  data: ReceiptData;
  defaultLang?: Lang;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const t = LABELS[lang];

  async function savePdf() {
    const el = receiptRef.current;
    if (!el) return;
    setSaving(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pdf = new jsPDF({ unit: "px", format: [w, h] });
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      const name = `${t.heading}-${data.receiptNo ?? "cheque"}`.replace(/\s+/g, "_");
      pdf.save(`${name}.pdf`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div
        className="receipt-no-print absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 my-6 w-full max-w-sm">
        {/* Controls (never printed) */}
        <div className="receipt-no-print mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{t.language}</span>
            <Select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-9 w-28"
            >
              <option value="uz">O&apos;zbek</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </Select>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* The receipt itself (this is what prints) */}
        <div
          ref={receiptRef}
          className="receipt-print rounded-2xl border border-border bg-white p-6 text-slate-900 shadow-xl"
        >
          <div className="mb-4 flex flex-col items-center gap-2 border-b border-dashed border-slate-300 pb-4">
            <Logo />
            <p className="text-xs uppercase tracking-wide text-slate-500">{t.heading}</p>
          </div>

          <div className="divide-y divide-slate-100">
            {data.receiptNo != null ? (
              <Row label={t.receiptNo} value={`№${data.receiptNo}`} />
            ) : null}
            <Row label={t.company} value={data.companyName} />
            {data.branchName ? <Row label={t.branch} value={data.branchName} /> : null}
            <Row label={t.student} value={data.studentName} />
            <Row label={t.phone} value={data.studentPhone} />
            {data.groupName ? <Row label={t.group} value={data.groupName} /> : null}
            <Row label={t.price} value={money(data.amount, lang)} />
            {data.teacherName ? <Row label={t.teacher} value={data.teacherName} /> : null}
            <Row label={t.type} value={METHOD_LABELS[lang][data.method] ?? data.method} />
            <Row label={t.amount} value={money(data.amount, lang)} />
            <Row label={t.date} value={fmtDate(data.paidAt)} />
          </div>

          <div className="mt-4 border-t border-dashed border-slate-300 pt-3">
            {data.recordedByName ? (
              <Row label={t.employee} value={data.recordedByName} />
            ) : null}
            <Row label={t.time} value={fmtDateTime(data.recordedAt)} />
          </div>
        </div>

        {/* Action buttons (never printed) */}
        <div className="receipt-no-print mt-3 flex justify-center gap-2">
          <Button variant="outline" onClick={savePdf} disabled={saving}>
            <FileDown />
            {saving ? t.saving : t.savePdf}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            {t.print}
          </Button>
        </div>
      </div>
    </div>
  );
}
