import QRCode from "qrcode";
import { ReplitConnectors } from "@replit/connectors-sdk";
import type { BookingView } from "./bookings.js";

/**
 * Sender address. Set FROM_EMAIL in production once the domain is verified
 * in Resend. Falls back to Resend's universal test address so the flow can
 * be exercised before domain verification is complete.
 */
const FROM_ADDRESS =
  process.env.FROM_EMAIL ?? "Шоколадная фабрика <onboarding@resend.dev>";
/** Factory email — set FACTORY_EMAIL env var in production */
const FACTORY_EMAIL = process.env.FACTORY_EMAIL ?? "factory@choco-tours.ru";

type Lang = "es" | "en" | "ru";

function normalizeLang(value: string): Lang {
  return value === "en" || value === "ru" ? value : "es";
}

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: string, lang: Lang = "ru"): string {
  const [y, m, d] = date.split("-");
  if (lang === "en") return `${m}/${d}/${y}`;
  return `${d}.${m}.${y}`;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Prices are stored as integer USD. */
function formatPrice(usd: number): string {
  return "$" + usd.toLocaleString("en-US");
}

function tourNameFor(b: BookingView, lang: Lang): string {
  if (lang === "es") return b.tourNameEs || b.tourName;
  if (lang === "en") return b.tourNameEn || b.tourName;
  return b.tourName;
}

interface ClientStrings {
  subject: (code: string) => string;
  title: string;
  greeting: (name: string) => string;
  intro: string;
  details: string;
  tour: string;
  date: string;
  start: string;
  guests: string;
  pricePerPerson: string;
  total: string;
  comment: string;
  qrHint: string;
  footer: string;
}

const CLIENT_STRINGS: Record<Lang, ClientStrings> = {
  es: {
    subject: (code) => `Su reserva está confirmada — código ${code}`,
    title: "Su reserva está confirmada 🍫",
    greeting: (name) => `¡Hola, <strong>${name}</strong>!`,
    intro:
      "Su reserva para la excursión se ha realizado con éxito. Guarde este código, lo necesitará a su llegada:",
    details: "Detalles de la reserva",
    tour: "Excursión",
    date: "Fecha",
    start: "Hora de inicio",
    guests: "Número de personas",
    pricePerPerson: "Precio por persona",
    total: "Total",
    comment: "Comentario",
    qrHint: "Muestre este código QR a su llegada a la fábrica — lo escanearemos para registrar su asistencia:",
    footer: "Si tiene alguna pregunta, póngase en contacto con el administrador.",
  },
  en: {
    subject: (code) => `Your booking is confirmed — code ${code}`,
    title: "Your booking is confirmed 🍫",
    greeting: (name) => `Hello, <strong>${name}</strong>!`,
    intro:
      "Your tour booking has been completed successfully. Keep this code — you will need it upon arrival:",
    details: "Booking details",
    tour: "Tour",
    date: "Date",
    start: "Start time",
    guests: "Number of guests",
    pricePerPerson: "Price per person",
    total: "Total",
    comment: "Comment",
    qrHint: "Show this QR code when you arrive at the factory — we will scan it to check you in:",
    footer: "If you have any questions, please contact the administrator.",
  },
  ru: {
    subject: (code) => `Ваша бронь подтверждена — код ${code}`,
    title: "Ваша бронь подтверждена 🍫",
    greeting: (name) => `Здравствуйте, <strong>${name}</strong>!`,
    intro:
      "Бронирование на экскурсию успешно оформлено. Сохраните этот код — он понадобится при посещении:",
    details: "Детали брони",
    tour: "Экскурсия",
    date: "Дата",
    start: "Начало",
    guests: "Количество гостей",
    pricePerPerson: "Цена за человека",
    total: "Итого",
    comment: "Комментарий",
    qrHint: "Покажите этот QR-код по приезде на фабрику — мы отсканируем его и отметим ваш визит:",
    footer: "Если у вас есть вопросы, обратитесь к администратору.",
  },
};

function clientHtml(b: BookingView, lang: Lang): string {
  const s = CLIENT_STRINGS[lang];
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#6b3a0f">${s.title}</h2>
  <p>${s.greeting(esc(b.customerName))}</p>
  <p>${s.intro}</p>
  <div style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;padding:16px;background:#fdf3e7;border-radius:8px;color:#6b3a0f">
    ${esc(b.code)}
  </div>
  <p style="margin-top:16px">${s.qrHint}</p>
  <div style="text-align:center;padding:8px 0">
    <img src="cid:booking-qr" alt="QR" width="220" height="220" style="display:inline-block" />
  </div>
  <h3 style="margin-top:24px">${s.details}</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#666">${s.tour}</td><td style="padding:6px 0"><strong>${esc(tourNameFor(b, lang))}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">${s.date}</td><td style="padding:6px 0">${esc(formatDate(b.date, lang))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">${s.start}</td><td style="padding:6px 0">${esc(formatTime(b.startTime))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">${s.guests}</td><td style="padding:6px 0">${esc(b.peopleCount)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">${s.pricePerPerson}</td><td style="padding:6px 0">${esc(formatPrice(b.pricePerPerson))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">${s.total}</td><td style="padding:6px 0"><strong>${esc(formatPrice(b.totalPrice))}</strong></td></tr>
    ${b.comment ? `<tr><td style="padding:6px 0;color:#666">${s.comment}</td><td style="padding:6px 0">${esc(b.comment)}</td></tr>` : ""}
  </table>
  <p style="margin-top:24px;color:#666;font-size:13px">${s.footer}</p>
</div>`;
}

function factoryHtml(b: BookingView): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#6b3a0f">Новая бронь #${esc(b.code)}</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#666">Код</td><td style="padding:6px 0"><strong>${esc(b.code)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Экскурсия</td><td style="padding:6px 0">${esc(b.tourName)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Дата</td><td style="padding:6px 0">${esc(formatDate(b.date))}, ${esc(formatTime(b.startTime))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Клиент</td><td style="padding:6px 0">${esc(b.customerName)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Телефон</td><td style="padding:6px 0">${esc(b.phone)}</td></tr>
    ${b.email ? `<tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${esc(b.email)}</td></tr>` : ""}
    <tr><td style="padding:6px 0;color:#666">Гостей</td><td style="padding:6px 0">${esc(b.peopleCount)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Итого</td><td style="padding:6px 0"><strong>${esc(formatPrice(b.totalPrice))}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Язык клиента</td><td style="padding:6px 0">${esc(b.language)}</td></tr>
    ${b.companyName ? `<tr><td style="padding:6px 0;color:#666">Партнёр</td><td style="padding:6px 0">${esc(b.companyName)}</td></tr>` : ""}
    ${b.comment ? `<tr><td style="padding:6px 0;color:#666">Комментарий</td><td style="padding:6px 0">${esc(b.comment)}</td></tr>` : ""}
  </table>
</div>`;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string; contentId?: string }[];
}): Promise<void> {
  // Prefer a direct RESEND_API_KEY secret when set; fall back to the
  // Replit Connectors proxy so the integration can be used if preferred.
  const directKey = process.env.RESEND_API_KEY;

  let response: Response;

  if (directKey) {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${directKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.attachments?.length
          ? {
              attachments: opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentId ? { content_id: a.contentId } : {}),
              })),
            }
          : {}),
      }),
    });
  } else {
    const connectors = new ReplitConnectors();
    response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.attachments?.length
          ? {
              attachments: opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentId ? { content_id: a.contentId } : {}),
              })),
            }
          : {}),
      }),
    });
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.text();
      detail = ` — ${body.slice(0, 200)}`;
    } catch {
      // ignore body read errors
    }
    throw new Error(
      `Resend returned HTTP ${response.status} for <${opts.to}>${detail}`,
    );
  }
}

export interface EmailSendResult {
  /** true when every attempted email was delivered to Resend successfully */
  ok: boolean;
  /** Human-readable description of what failed (empty when ok) */
  errors: string[];
}

/**
 * Send booking confirmation emails to the client (if email provided) and
 * to the factory. The client email is sent in the client's UI language
 * (es/en/ru); the factory email stays in Russian. Errors are caught and
 * reported in the returned result — email failure must NOT block the
 * booking response, but callers are expected to record the outcome
 * (see recordEmailOutcome in routes) so failures are not silent.
 */
export async function sendBookingEmails(
  booking: BookingView,
): Promise<EmailSendResult> {
  const lang = normalizeLang(booking.language);
  const safeCode = booking.code.replace(/[^A-Z0-9]/g, "");
  const safeTourName = booking.tourName.replace(/[\r\n]/g, " ");
  const safeDate = formatDate(booking.date);

  const errors: string[] = [];
  const tasks: Promise<void>[] = [];

  if (booking.email) {
    let qrBase64 = "";
    try {
      qrBase64 = (
        await QRCode.toBuffer(booking.code, { width: 440, margin: 1 })
      ).toString("base64");
    } catch (err) {
      console.error("[email] failed to generate QR code", err);
    }
    tasks.push(
      sendEmail({
        to: booking.email,
        subject: CLIENT_STRINGS[lang].subject(safeCode),
        html: clientHtml(booking, lang),
        attachments: qrBase64
          ? [{ filename: "booking-qr.png", content: qrBase64, contentId: "booking-qr" }]
          : undefined,
      }).catch((err) => {
        console.error("[email] failed to send client confirmation", err);
        errors.push(
          `client confirmation: ${err instanceof Error ? err.message : String(err)}`,
        );
      }),
    );
  }

  tasks.push(
    sendEmail({
      to: FACTORY_EMAIL,
      subject: `Новая бронь ${safeCode} — ${safeTourName} ${safeDate}`,
      html: factoryHtml(booking),
    }).catch((err) => {
      console.error("[email] failed to send factory notification", err);
      errors.push(
        `factory notification: ${err instanceof Error ? err.message : String(err)}`,
      );
    }),
  );

  await Promise.all(tasks);
  return { ok: errors.length === 0, errors };
}
