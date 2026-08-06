import { ReplitConnectors } from "@replit/connectors-sdk";
import type { BookingView } from "./bookings.js";

const FROM_ADDRESS = "Шоколадная фабрика <notifications@choco-tours.ru>";
/** Factory email — set FACTORY_EMAIL env var in production */
const FACTORY_EMAIL = process.env.FACTORY_EMAIL ?? "factory@choco-tours.ru";

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatPrice(rub: number): string {
  return rub.toLocaleString("ru-RU") + " ₽";
}

function clientHtml(b: BookingView): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#6b3a0f">Ваша бронь подтверждена 🍫</h2>
  <p>Здравствуйте, <strong>${esc(b.customerName)}</strong>!</p>
  <p>Бронирование на экскурсию успешно оформлено. Сохраните этот код — он понадобится при заселении:</p>
  <div style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;padding:16px;background:#fdf3e7;border-radius:8px;color:#6b3a0f">
    ${esc(b.code)}
  </div>
  <h3 style="margin-top:24px">Детали брони</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#666">Экскурсия</td><td style="padding:6px 0"><strong>${esc(b.tourName)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#666">Дата</td><td style="padding:6px 0">${esc(formatDate(b.date))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Начало</td><td style="padding:6px 0">${esc(formatTime(b.startTime))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Количество гостей</td><td style="padding:6px 0">${esc(b.peopleCount)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Цена за человека</td><td style="padding:6px 0">${esc(formatPrice(b.pricePerPerson))}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Итого</td><td style="padding:6px 0"><strong>${esc(formatPrice(b.totalPrice))}</strong></td></tr>
    ${b.comment ? `<tr><td style="padding:6px 0;color:#666">Комментарий</td><td style="padding:6px 0">${esc(b.comment)}</td></tr>` : ""}
  </table>
  <p style="margin-top:24px;color:#666;font-size:13px">Если у вас есть вопросы, обратитесь к администратору.</p>
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
    ${b.companyName ? `<tr><td style="padding:6px 0;color:#666">Партнёр</td><td style="padding:6px 0">${esc(b.companyName)}</td></tr>` : ""}
    ${b.comment ? `<tr><td style="padding:6px 0;color:#666">Комментарий</td><td style="padding:6px 0">${esc(b.comment)}</td></tr>` : ""}
  </table>
</div>`;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

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

/**
 * Send booking confirmation emails to the client (if email provided) and
 * to the factory. Errors are caught and logged — email failure must NOT
 * block the booking response.
 */
export async function sendBookingEmails(booking: BookingView): Promise<void> {
  const safeCode = booking.code.replace(/[^A-Z0-9]/g, "");
  const safeTourName = booking.tourName.replace(/[\r\n]/g, " ");
  const safeDate = formatDate(booking.date);

  const tasks: Promise<void>[] = [];

  if (booking.email) {
    tasks.push(
      sendEmail({
        to: booking.email,
        subject: `Ваша бронь подтверждена — код ${safeCode}`,
        html: clientHtml(booking),
      }).catch((err) =>
        console.error("[email] failed to send client confirmation", err),
      ),
    );
  }

  tasks.push(
    sendEmail({
      to: FACTORY_EMAIL,
      subject: `Новая бронь ${safeCode} — ${safeTourName} ${safeDate}`,
      html: factoryHtml(booking),
    }).catch((err) =>
      console.error("[email] failed to send factory notification", err),
    ),
  );

  await Promise.all(tasks);
}
