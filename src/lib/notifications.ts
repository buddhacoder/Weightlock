import { Resend } from "resend";
import type { NotificationType } from "@/types/database";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "WeightLock <noreply@weightlock.app>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface NotificationPayload {
  contractId?: string;
  participantName?: string;
  refereeName?: string;
  weight?: number;
  amountCents?: number;
  milestone?: number;
  weekNumber?: number;
  inviteToken?: string;
  reason?: string;
  [key: string]: unknown;
}

const templates: Record<
  NotificationType,
  (payload: NotificationPayload) => { subject: string; html: string }
> = {
  referee_invited: (p) => ({
    subject: "You've been invited to be a WeightLock referee",
    html: `
      <h2>You've been invited!</h2>
      <p>${p.participantName || "Someone"} wants you to be their accountability referee on WeightLock.</p>
      <p>As a referee, you'll verify weigh-ins and earn money for your role.</p>
      <p><a href="${appUrl}/accept-invite/${p.inviteToken}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Accept Invitation</a></p>
      <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
    `,
  }),
  weighin_due_reminder: (p) => ({
    subject: "WeightLock: Weigh-in reminder",
    html: `
      <h2>Time to weigh in!</h2>
      <p>You have a weigh-in due for your WeightLock contract. Don't miss it — consistency keeps your funds safe.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}/weigh-in" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Log Weigh-In</a></p>
    `,
  }),
  weighin_awaiting_verification: (p) => ({
    subject: "WeightLock: New weigh-in to verify",
    html: `
      <h2>New weigh-in submitted</h2>
      <p>${p.participantName || "Your participant"} submitted a weigh-in of ${p.weight} lb and needs your verification.</p>
      <p><a href="${appUrl}/referee" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Review Weigh-In</a></p>
    `,
  }),
  weighin_approved: (p) => ({
    subject: "WeightLock: Weigh-in approved!",
    html: `
      <h2>Weigh-in verified!</h2>
      <p>Your weigh-in of ${p.weight} lb has been approved by your referee.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Progress</a></p>
    `,
  }),
  weighin_rejected: (p) => ({
    subject: "WeightLock: Weigh-in rejected",
    html: `
      <h2>Weigh-in not verified</h2>
      <p>Your referee was unable to verify your weigh-in.${p.reason ? ` Reason: ${p.reason}` : ""}</p>
      <p>Please submit a new weigh-in.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}/weigh-in" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Submit Again</a></p>
    `,
  }),
  weekly_payout_triggered: (p) => ({
    subject: `WeightLock: Week ${p.weekNumber} payout`,
    html: `
      <h2>Weekly evaluation complete</h2>
      <p>Week ${p.weekNumber} has been evaluated. A payout of $${((p.amountCents || 0) / 100).toFixed(2)} has been triggered.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}/wallet" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Wallet</a></p>
    `,
  }),
  milestone_payout_triggered: (p) => ({
    subject: `WeightLock: ${p.milestone} lb milestone reached!`,
    html: `
      <h2>Milestone achieved! 🎯</h2>
      <p>The ${p.milestone} lb weight loss milestone has been reached! A payout of $${((p.amountCents || 0) / 100).toFixed(2)} has been triggered.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Progress</a></p>
    `,
  }),
  completion_reached: (p) => ({
    subject: "WeightLock: Goal achieved! Contract completed!",
    html: `
      <h2>Congratulations! 🏆</h2>
      <p>The weight loss goal has been achieved! The completion bonus of $${((p.amountCents || 0) / 100).toFixed(2)} has been triggered.</p>
      <p>This contract is now complete.</p>
      <p><a href="${appUrl}/contracts/${p.contractId}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Contract</a></p>
    `,
  }),
};

export async function sendNotification(
  email: string,
  type: NotificationType,
  payload: NotificationPayload
) {
  const template = templates[type](payload);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: template.subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
            <h1 style="color: #111; font-size: 24px; margin: 0;">WeightLock</h1>
            <p style="color: #666; font-size: 14px; margin: 4px 0 0;">Put money behind your goals</p>
          </div>
          <div style="padding: 24px 0;">
            ${template.html}
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 16px; color: #999; font-size: 12px; text-align: center;">
            <p>WeightLock — Behavioral commitment contracts</p>
          </div>
        </div>
      `,
    });
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error);
    return { success: false, error };
  }
}
