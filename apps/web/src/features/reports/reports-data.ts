export type ReportCategory = "envelope" | "recipient" | "usage";

export interface Report {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  columns?: string[];
}

export const REPORTS: Report[] = [
  {
    id: "envelope-report",
    name: "Envelope Report",
    description: "Information on envelopes sent from this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Status", "Sender Name", "Recipient Name", "Sent On", "Last Activity", "Completed On", "Completion Time (DD:HH:MM)"],
  },
  {
    id: "envelope-recipient-report",
    name: "Envelope Recipient Report",
    description: "Sender and recipient information on all envelopes sent from this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Status", "Sender Name", "Recipient Name", "Routing Order", "Action", "Sent On", "Completed On", "Completion Time (DD:HH:MM)"],
  },
  {
    id: "envelope-status-report",
    name: "Envelope Status Report",
    description: "Totals based on envelope status for this account.",
    category: "envelope",
    columns: ["Date", "Sent", "Delivered", "Signed", "Completed", "Declined", "Voided"],
  },
  {
    id: "envelope-velocity-report",
    name: "Envelope Velocity Report",
    description: "Totals based on envelope completion time for this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Sender Name", "Sent On", "Completed On", "Completion Time (DD:HH:MM)"],
  },
  {
    id: "envelope-volume-report",
    name: "Envelope Volume Report",
    description: "Envelope status totals for a specific time period for this account.",
    category: "envelope",
    columns: ["Period", "Sent", "Completed", "Declined", "Voided", "Expired"],
  },
  {
    id: "envelope-authentication-report",
    name: "Envelope Authentication Report",
    description: "Information on envelope authentication for this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Sender Name", "Authentication Type", "Recipient Name", "Sent On"],
  },
  {
    id: "purged-envelope-report",
    name: "Purged Envelope Report",
    description: "List of purged envelopes by envelope ID for this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Sender Name", "Sent On", "Purged On", "Status"],
  },
  {
    id: "failed-delivery-report",
    name: "Failed Delivery Report",
    description: "A list of failed envelopes from this account.",
    category: "envelope",
    columns: ["Envelope ID", "Subject", "Sender Name", "Recipient Name", "Recipient Email", "Sent On", "Failure Reason"],
  },
  {
    id: "recipient-activity-report",
    name: "Recipient Activity Report",
    description: "Recipient activity on all envelopes sent from this account.",
    category: "recipient",
    columns: ["Envelope ID", "Subject", "Sender Name", "Recipient Name", "Recipient Email", "Status", "Sent On", "Signed On"],
  },
  {
    id: "recipient-authentication-report",
    name: "Recipient Authentication Report",
    description: "Identity verification data for this account.",
    category: "recipient",
    columns: ["Envelope ID", "Recipient Name", "Recipient Email", "Authentication Type", "Result", "Sent On"],
  },
  {
    id: "user-activity-report",
    name: "User Activity Report",
    description: "User activity for this account.",
    category: "usage",
    columns: ["User Name", "Email", "Envelopes Sent", "Envelopes Completed", "Templates Used", "Last Active"],
  },
  {
    id: "group-activity-report",
    name: "Group Activity Report",
    description: "Activity broken down by group.",
    category: "usage",
    columns: ["Group Name", "Members", "Envelopes Sent", "Envelopes Completed", "Templates Used"],
  },
  {
    id: "account-activity-report",
    name: "Account Activity Report",
    description: "Summary of user, envelope, and template data.",
    category: "usage",
    columns: ["Period", "Active Users", "Envelopes Sent", "Envelopes Completed", "Templates Created"],
  },
  {
    id: "account-authentication-report",
    name: "Account Authentication Report",
    description: "Summary authentication activity and results.",
    category: "usage",
    columns: ["Period", "Authentication Type", "Attempts", "Successes", "Failures"],
  },
  {
    id: "template-report",
    name: "Template Report",
    description: "Overview of templates created for this account.",
    category: "usage",
    columns: ["Template Name", "Owner", "Created Date", "Last Modified", "Times Used"],
  },
  {
    id: "template-usage-report",
    name: "Template Usage Report",
    description: "Overview of template usage for this account.",
    category: "usage",
    columns: ["Template Name", "Owner", "Times Used", "Last Used", "Envelopes Completed"],
  },
  {
    id: "signature-type-usage-report",
    name: "Signature Type Usage Report",
    description: "Usage for signature type in a specified time period.",
    category: "usage",
    columns: ["Signature Type", "Count", "Percentage", "Period"],
  },
];

export const CATEGORY_COUNTS = {
  all: REPORTS.length,
  envelope: REPORTS.filter((r) => r.category === "envelope").length,
  recipient: REPORTS.filter((r) => r.category === "recipient").length,
  usage: REPORTS.filter((r) => r.category === "usage").length,
  custom: 0,
};

export function getReportById(id: string): Report | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function getReportsByCategory(category: ReportCategory | "all"): Report[] {
  if (category === "all") return REPORTS;
  return REPORTS.filter((r) => r.category === category);
}
