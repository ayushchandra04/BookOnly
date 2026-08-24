import nodemailer from "nodemailer";
import { formatPrice } from "./currency.js";

let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      "[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — emails will be logged to the console instead of sent."
    );
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

async function sendMail(args) {
  const t = getTransporter();
  if (!t) {
    console.info(`[email] (dev fallback) To: ${args.to} | Subject: ${args.subject}`);
    console.info(args.html);
    return;
  }
  await t.sendMail({
    from: `"Bookify" <${process.env.GMAIL_USER}>`,
    to: args.to,
    subject: args.subject,
    html: args.html,
    attachments: args.attachments,
  });
}

export async function sendBookingConfirmationEmail(opts) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Booking Confirmed 🎟️</h2>
      <p>Hi ${opts.customerName},</p>
      <p>Your booking for <strong>${opts.eventTitle}</strong> is confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:4px 0;color:#666;">Date</td><td style="padding:4px 0;">${opts.eventDate} ${opts.eventTime}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Venue</td><td style="padding:4px 0;">${opts.venueName}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Seats</td><td style="padding:4px 0;">${opts.seatLabels.join(", ")}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Total</td><td style="padding:4px 0;">${formatPrice(opts.totalAmount)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Booking Ref</td><td style="padding:4px 0;"><strong>${opts.bookingRef}</strong></td></tr>
      </table>
      <p>Show this QR code at entry:</p>
      <img src="cid:qrcode" alt="Booking QR Code" width="240" height="240" />
      <p style="color:#888; font-size: 12px; margin-top: 24px;">This QR code encodes your booking reference for check-in verification.</p>
    </div>
  `;

  await sendMail({
    to: opts.to,
    subject: `Booking Confirmed — ${opts.eventTitle}`,
    html,
    attachments: [
      { filename: "ticket-qr.png", content: opts.qrPngBuffer, cid: "qrcode" },
    ],
  });
}

export async function sendWaitlistOfferEmail(opts) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>A seat opened up 🎉</h2>
      <p>Hi ${opts.customerName},</p>
      <p>A <strong>${opts.category}</strong> seat (${opts.seatLabel}) for <strong>${opts.eventTitle}</strong> is now available for you, since you were on the waitlist.</p>
      <p><a href="${opts.acceptUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Claim your seat</a></p>
      <p style="color:#888; font-size: 13px;">This offer expires in ${opts.expiresInMinutes} minutes. If you don't complete the booking in time, the seat will be offered to the next person on the waitlist.</p>
    </div>
  `;

  await sendMail({
    to: opts.to,
    subject: `Seat available — ${opts.eventTitle} (offer expires in ${opts.expiresInMinutes} min)`,
    html,
  });
}
