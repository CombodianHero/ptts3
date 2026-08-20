/**
 * GET /api/cron/reminders
 * Scheduled reminder job — configure as a Vercel Cron in vercel.json,
 * e.g. { "path": "/api/cron/reminders", "schedule": "0 9 * * *" }.
 * Protect it with CRON_SECRET so it can't be triggered by the public.
 * Sends at most one reminder per booking/stage per MIN_GAP_HOURS window.
 */
const { prisma } = require("../../lib/db");
const { sendAndLogEmail } = require("../../lib/mailer");
const { sendJson, methodGuard, withErrorHandling } = require("../../lib/apiUtils");

const MIN_GAP_HOURS = 24;
const REMIND_AFTER_HOURS = 24; // don't nag within the first day

module.exports = withErrorHandling(async (req, res) => {
  if (!methodGuard(req, res, "GET")) return;

  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return sendJson(res, 401, { error: "Unauthorized." });
    }
  }

  const cutoff = new Date(Date.now() - REMIND_AFTER_HOURS * 60 * 60 * 1000);

  const requests = await prisma.paymentRequest.findMany({
    where: { status: "ACTIVE", createdAt: { lt: cutoff }, expiresAt: { gt: new Date() } },
    include: { booking: true },
  });

  let sent = 0;
  for (const reqRow of requests) {
    const paidStatuses = reqRow.paymentStage === "ADVANCE" ? ["ADVANCE_PAID", "FULLY_PAID"] : ["FULLY_PAID"];
    if (paidStatuses.includes(reqRow.booking.paymentStatus)) continue;

    const lastReminder = await prisma.reminderLog.findFirst({
      where: { bookingId: reqRow.bookingId, stage: reqRow.paymentStage },
      orderBy: { sentAt: "desc" },
    });
    if (lastReminder && Date.now() - new Date(lastReminder.sentAt).getTime() < MIN_GAP_HOURS * 60 * 60 * 1000) continue;

    const paymentUrl = `${process.env.APP_URL || ""}/payment/${reqRow.secureToken}`;
    await sendAndLogEmail(
      reqRow.paymentStage === "ADVANCE" ? "booking_approved_payment_required" : "final_payment_required",
      reqRow.booking.customerEmail,
      { booking: reqRow.booking, paymentUrl, finalAmountDue: Number(reqRow.amount) },
      reqRow.bookingId
    );
    await prisma.reminderLog.create({ data: { bookingId: reqRow.bookingId, stage: reqRow.paymentStage } });
    sent += 1;
  }

  sendJson(res, 200, { success: true, remindersSent: sent });
});
