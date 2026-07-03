import { createHash, randomBytes } from "crypto";
import { db } from "./index.js";
import {
  usersTable,
  clientsTable,
  qrCampaignsTable,
  reviewsTable,
  feedbackTable,
  subscriptionsTable,
  invoicesTable,
  notificationsTable,
  auditLogsTable,
  settingsTable,
} from "./schema/index.js";

function hash(pw: string) {
  return createHash("sha256").update(pw + "rfp_salt").digest("hex");
}

function uid(len = 8) {
  return randomBytes(len).toString("hex").toUpperCase().slice(0, len);
}

async function seed() {
  console.log("Seeding database...");

  // Users
  const [admin] = await db.insert(usersTable).values({
    name: "Paramesh Paidakula",
    email: "paramesh.paidakula@gmail.com",
    passwordHash: hash("Advento@2026"),
    role: "super_admin",
    status: "active",
    phone: "+1 (555) 001-0001",
  }).returning();

  const [manager1] = await db.insert(usersTable).values({
    name: "Sarah Chen",
    email: "sarah@reviewflowpro.com",
    passwordHash: hash("manager123"),
    role: "manager",
    status: "active",
    phone: "+1 (555) 001-0002",
  }).returning();

  const [manager2] = await db.insert(usersTable).values({
    name: "James Okonkwo",
    email: "james@reviewflowpro.com",
    passwordHash: hash("manager123"),
    role: "manager",
    status: "active",
    phone: "+1 (555) 001-0003",
  }).returning();

  console.log("Users seeded");

  // Clients
  const clients = await db.insert(clientsTable).values([
    {
      clientId: `CLT-${uid()}`,
      name: "Sophia Laurent",
      businessName: "The Grand Monarch Hotel",
      googleBusinessName: "Grand Monarch Hotel & Spa",
      businessCategory: "Hotel",
      phone: "+1 (555) 100-0001",
      whatsappNumber: "+15551000001",
      email: "sophia@grandmonarch.com",
      address: "125 Fifth Avenue, New York, NY 10010",
      googleReviewLink: "https://g.page/r/grand-monarch-review",
      recommendedKeywords: ["luxurious rooms", "exceptional service", "stunning views", "world-class spa", "fine dining"],
      subscriptionPlan: "enterprise",
      renewalDate: "2026-08-15",
      assignedManagerId: manager1.id,
      status: "active",
      paymentStatus: "paid",
      notes: "VIP client — flagship hotel group. Handles 3 properties.",
      totalScans: 1842,
      totalReviews: 563,
      positiveReviews: 521,
      negativeReviews: 42,
    },
    {
      clientId: `CLT-${uid()}`,
      name: "Marco Bianchi",
      businessName: "Osteria Lombarda",
      googleBusinessName: "Osteria Lombarda NYC",
      businessCategory: "Restaurant",
      phone: "+1 (555) 100-0002",
      whatsappNumber: "+15551000002",
      email: "marco@osterialombarda.com",
      address: "88 West 12th Street, New York, NY 10011",
      googleReviewLink: "https://g.page/r/osteria-lombarda-review",
      recommendedKeywords: ["authentic Italian", "fresh pasta", "cozy atmosphere", "excellent wine list", "attentive staff"],
      subscriptionPlan: "professional",
      renewalDate: "2026-06-30",
      assignedManagerId: manager1.id,
      status: "active",
      paymentStatus: "paid",
      notes: "Michelin-starred Italian restaurant. Very prompt with payments.",
      totalScans: 934,
      totalReviews: 287,
      positiveReviews: 261,
      negativeReviews: 26,
    },
    {
      clientId: `CLT-${uid()}`,
      name: "Priya Sharma",
      businessName: "Nirvana Wellness Spa",
      googleBusinessName: "Nirvana Wellness & Beauty Spa",
      businessCategory: "Spa & Wellness",
      phone: "+1 (555) 100-0003",
      email: "priya@nirvanaspa.com",
      address: "450 Lexington Ave, Suite 210, New York, NY 10017",
      googleReviewLink: "https://g.page/r/nirvana-spa-review",
      recommendedKeywords: ["relaxing massage", "professional therapists", "clean facilities", "calming ambiance", "great facials"],
      subscriptionPlan: "professional",
      renewalDate: "2026-07-20",
      assignedManagerId: manager2.id,
      status: "active",
      paymentStatus: "pending",
      notes: "Second renewal coming up — send reminder 2 weeks prior.",
      totalScans: 672,
      totalReviews: 198,
      positiveReviews: 181,
      negativeReviews: 17,
    },
    {
      clientId: `CLT-${uid()}`,
      name: "David Kim",
      businessName: "Seoul Street Kitchen",
      googleBusinessName: "Seoul Street Kitchen",
      businessCategory: "Restaurant",
      phone: "+1 (555) 100-0004",
      email: "david@seoulstreet.com",
      address: "312 W 34th St, New York, NY 10001",
      googleReviewLink: "https://g.page/r/seoul-street-review",
      recommendedKeywords: ["authentic Korean BBQ", "friendly staff", "great portions", "fresh ingredients", "fast service"],
      subscriptionPlan: "basic",
      renewalDate: "2026-05-25",
      assignedManagerId: manager2.id,
      status: "active",
      paymentStatus: "overdue",
      notes: "Payment 12 days overdue — follow up immediately.",
      totalScans: 389,
      totalReviews: 92,
      positiveReviews: 79,
      negativeReviews: 13,
    },
    {
      clientId: `CLT-${uid()}`,
      name: "Elena Vasquez",
      businessName: "Playa Azul Resort",
      googleBusinessName: "Playa Azul Resort & Beach Club",
      businessCategory: "Hotel",
      phone: "+1 (555) 100-0005",
      email: "elena@playaazul.com",
      address: "1 Ocean Drive, Miami Beach, FL 33139",
      googleReviewLink: "https://g.page/r/playa-azul-review",
      recommendedKeywords: ["beachfront paradise", "stunning pool", "excellent cocktails", "helpful concierge", "pristine beach access"],
      subscriptionPlan: "enterprise",
      renewalDate: "2026-09-10",
      assignedManagerId: manager1.id,
      status: "active",
      paymentStatus: "paid",
      totalScans: 2103,
      totalReviews: 614,
      positiveReviews: 571,
      negativeReviews: 43,
    },
    {
      clientId: `CLT-${uid()}`,
      name: "Thomas Wright",
      businessName: "Wright & Co. Auto Detailing",
      googleBusinessName: "Wright & Co. Auto Detailing",
      businessCategory: "Automotive",
      phone: "+1 (555) 100-0006",
      email: "thomas@wrightauto.com",
      address: "77 Industrial Blvd, Chicago, IL 60601",
      googleReviewLink: "https://g.page/r/wright-auto-review",
      recommendedKeywords: ["spotless finish", "attention to detail", "fast turnaround", "friendly team", "fair pricing"],
      subscriptionPlan: "basic",
      renewalDate: "2026-11-01",
      assignedManagerId: manager2.id,
      status: "inactive",
      paymentStatus: "paid",
      totalScans: 141,
      totalReviews: 38,
      positiveReviews: 33,
      negativeReviews: 5,
    },
  ]).returning();

  console.log("Clients seeded");

  // QR Campaigns
  const campaigns = await db.insert(qrCampaignsTable).values([
    {
      qrCode: uid(12),
      name: "Lobby Check-in QR",
      clientId: clients[0].id,
      destinationUrl: "https://reviewflowpro.app/review/lobby",
      status: "active",
      totalScans: 1134,
      totalReviews: 342,
      conversionRate: 30.2,
    },
    {
      qrCode: uid(12),
      name: "Spa Reception QR",
      clientId: clients[0].id,
      destinationUrl: "https://reviewflowpro.app/review/spa",
      status: "active",
      totalScans: 708,
      totalReviews: 221,
      conversionRate: 31.2,
    },
    {
      qrCode: uid(12),
      name: "Table QR — Main Dining",
      clientId: clients[1].id,
      destinationUrl: "https://reviewflowpro.app/review/dining",
      status: "active",
      totalScans: 934,
      totalReviews: 287,
      conversionRate: 30.7,
    },
    {
      qrCode: uid(12),
      name: "Reception Desk QR",
      clientId: clients[2].id,
      destinationUrl: "https://reviewflowpro.app/review/reception",
      status: "active",
      totalScans: 672,
      totalReviews: 198,
      conversionRate: 29.5,
    },
    {
      qrCode: uid(12),
      name: "Counter QR",
      clientId: clients[3].id,
      destinationUrl: "https://reviewflowpro.app/review/counter",
      status: "active",
      totalScans: 389,
      totalReviews: 92,
      conversionRate: 23.6,
    },
    {
      qrCode: uid(12),
      name: "Poolside QR",
      clientId: clients[4].id,
      destinationUrl: "https://reviewflowpro.app/review/pool",
      status: "active",
      totalScans: 2103,
      totalReviews: 614,
      conversionRate: 29.2,
    },
    {
      qrCode: uid(12),
      name: "Front Desk QR",
      clientId: clients[5].id,
      destinationUrl: "https://reviewflowpro.app/review/front",
      status: "inactive",
      totalScans: 141,
      totalReviews: 38,
      conversionRate: 27.0,
    },
  ]).returning();

  console.log("QR campaigns seeded");

  // Reviews
  const reviewData = [
    { rating: 5, text: "Absolutely spectacular stay. The staff remembered our names by day two — that kind of personal touch is rare.", keywords: ["exceptional service", "luxurious rooms"] },
    { rating: 5, text: "Best spa experience I've ever had. The hot stone massage was transcendent. Booking again immediately.", keywords: ["world-class spa"] },
    { rating: 4, text: "Stunning property. The pool area is breathtaking and the cocktails from the swim-up bar were incredible.", keywords: ["stunning views", "fine dining"] },
    { rating: 5, text: "The pasta here rivals anything in Rome. Fresh, handmade, perfectly sauced. Became a regular after the first visit.", keywords: ["authentic Italian", "fresh pasta"] },
    { rating: 4, text: "Warm and cozy. Service is impeccable and the wine list is genuinely impressive for the price point.", keywords: ["cozy atmosphere", "excellent wine list"] },
    { rating: 5, text: "Nirvana lives up to its name. Left feeling completely restored — the hot stone therapy is exceptional.", keywords: ["relaxing massage", "calming ambiance"] },
    { rating: 4, text: "Cleanest spa I've visited in the city. Professional therapists and the facial gave immediate results.", keywords: ["professional therapists", "clean facilities"] },
    { rating: 5, text: "The Korean BBQ is outrageously good. Portions are generous and the staff kept the grill perfectly maintained.", keywords: ["authentic Korean BBQ", "great portions"] },
    { rating: 4, text: "Quick, quality work at a fair price. Car looks brand new after every visit. Won't go anywhere else.", keywords: ["spotless finish", "fair pricing"] },
  ];

  for (let i = 0; i < reviewData.length; i++) {
    const camp = campaigns[i % campaigns.length];
    await db.insert(reviewsTable).values({
      campaignId: camp.id,
      clientId: camp.clientId,
      rating: reviewData[i].rating,
      reviewText: reviewData[i].text,
      keywords: reviewData[i].keywords,
      redirectedToGoogle: true,
      deviceType: i % 2 === 0 ? "mobile" : "desktop",
    });
  }

  console.log("Reviews seeded");

  // Feedback
  await db.insert(feedbackTable).values([
    {
      campaignId: campaigns[0].id,
      clientId: clients[0].id,
      rating: 2,
      feedbackText: "The AC in room 412 wasn't working for two days. Staff were apologetic but the issue persisted.",
      complaintCategory: "Facilities",
      customerName: "Michael Barnes",
      customerPhone: "+1 (555) 200-0001",
      customerEmail: "m.barnes@email.com",
      priority: "high",
      status: "in_progress",
      deviceType: "mobile",
    },
    {
      campaignId: campaigns[2].id,
      clientId: clients[1].id,
      rating: 3,
      feedbackText: "Food was good but the wait time was over 40 minutes for two pasta dishes on a Tuesday night.",
      complaintCategory: "Service Speed",
      customerName: "Jennifer Reyes",
      priority: "medium",
      status: "new",
      deviceType: "mobile",
    },
    {
      campaignId: campaigns[3].id,
      clientId: clients[2].id,
      rating: 1,
      feedbackText: "My therapist showed up 25 minutes late for my 60-minute appointment and the session was still cut short.",
      complaintCategory: "Service",
      customerName: "Rachel Goldstein",
      customerEmail: "r.goldstein@email.com",
      priority: "urgent",
      status: "new",
      deviceType: "mobile",
    },
    {
      campaignId: campaigns[4].id,
      clientId: clients[3].id,
      rating: 2,
      feedbackText: "Ordered the premium set but received standard portions. No apology when pointed out.",
      complaintCategory: "Food Quality",
      customerName: "Chris Nakamura",
      priority: "medium",
      status: "resolved",
      deviceType: "mobile",
    },
  ]);

  console.log("Feedback seeded");

  // Subscriptions
  const subs = await db.insert(subscriptionsTable).values([
    { clientId: clients[0].id, plan: "enterprise", amount: 599, status: "active", startDate: "2026-02-15", endDate: "2026-08-15", autoRenew: true },
    { clientId: clients[1].id, plan: "professional", amount: 299, status: "active", startDate: "2025-12-30", endDate: "2026-06-30", autoRenew: true },
    { clientId: clients[2].id, plan: "professional", amount: 299, status: "active", startDate: "2026-01-20", endDate: "2026-07-20", autoRenew: false },
    { clientId: clients[3].id, plan: "basic", amount: 99, status: "active", startDate: "2025-11-25", endDate: "2026-05-25", autoRenew: true },
    { clientId: clients[4].id, plan: "enterprise", amount: 599, status: "active", startDate: "2026-03-10", endDate: "2026-09-10", autoRenew: true },
    { clientId: clients[5].id, plan: "basic", amount: 99, status: "inactive", startDate: "2025-05-01", endDate: "2025-11-01", autoRenew: false },
  ]).returning();

  // Invoices
  await db.insert(invoicesTable).values([
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[0].id, subscriptionId: subs[0].id, amount: 599, status: "paid", dueDate: "2026-02-15", paidDate: "2026-02-14" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[1].id, subscriptionId: subs[1].id, amount: 299, status: "paid", dueDate: "2025-12-30", paidDate: "2025-12-28" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[2].id, subscriptionId: subs[2].id, amount: 299, status: "pending", dueDate: "2026-05-20" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[3].id, subscriptionId: subs[3].id, amount: 99, status: "overdue", dueDate: "2026-04-25" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[4].id, subscriptionId: subs[4].id, amount: 599, status: "paid", dueDate: "2026-03-10", paidDate: "2026-03-09" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[5].id, subscriptionId: subs[5].id, amount: 99, status: "paid", dueDate: "2025-05-01", paidDate: "2025-04-30" },
    { invoiceNumber: `INV-2026-${uid(6)}`, clientId: clients[0].id, subscriptionId: subs[0].id, amount: 599, status: "pending", dueDate: "2026-08-15" },
  ]);

  console.log("Billing seeded");

  // Notifications
  await db.insert(notificationsTable).values([
    { userId: admin.id, title: "New 5-Star Review", message: "Grand Monarch Hotel received a 5-star review this morning.", type: "review", read: false },
    { userId: admin.id, title: "Urgent Feedback Alert", message: "Nirvana Wellness Spa received a 1-star complaint. Immediate action required.", type: "feedback", read: false },
    { userId: admin.id, title: "Invoice Overdue", message: "Seoul Street Kitchen invoice is 12 days overdue.", type: "billing", read: false },
    { userId: admin.id, title: "Subscription Expiring Soon", message: "Osteria Lombarda subscription expires in 23 days.", type: "billing", read: true },
    { userId: admin.id, title: "New Client Onboarded", message: "Playa Azul Resort has been successfully activated.", type: "system", read: true },
    { userId: manager1.id, title: "QR Milestone", message: "Lobby Check-in QR for Grand Monarch has exceeded 1,000 scans!", type: "system", read: false },
    { userId: manager1.id, title: "New Review Received", message: "Osteria Lombarda received a 5-star review.", type: "review", read: true },
    { userId: manager2.id, title: "Priority Feedback", message: "Nirvana Wellness Spa has a new urgent complaint from Rachel Goldstein.", type: "feedback", read: false },
  ]);

  // Audit Logs
  await db.insert(auditLogsTable).values([
    { userId: admin.id, userName: admin.name, action: "CREATE", entity: "client", entityId: clients[0].id, details: "Created client: The Grand Monarch Hotel", ipAddress: "192.168.1.1" },
    { userId: admin.id, userName: admin.name, action: "CREATE", entity: "client", entityId: clients[1].id, details: "Created client: Osteria Lombarda", ipAddress: "192.168.1.1" },
    { userId: manager1.id, userName: manager1.name, action: "CREATE", entity: "qr_campaign", entityId: campaigns[0].id, details: "Created QR campaign: Lobby Check-in QR", ipAddress: "192.168.1.5" },
    { userId: manager1.id, userName: manager1.name, action: "UPDATE", entity: "client", entityId: clients[2].id, details: "Updated payment status to pending", ipAddress: "192.168.1.5" },
    { userId: admin.id, userName: admin.name, action: "CREATE", entity: "subscription", entityId: subs[0].id, details: "Created enterprise subscription for Grand Monarch Hotel", ipAddress: "192.168.1.1" },
    { userId: manager2.id, userName: manager2.name, action: "UPDATE", entity: "feedback", entityId: 3, details: "Updated feedback status to in_progress", ipAddress: "192.168.1.8" },
    { userId: admin.id, userName: admin.name, action: "CREATE", entity: "invoice", details: "Generated invoice for Grand Monarch Hotel: $599", ipAddress: "192.168.1.1" },
    { userId: admin.id, userName: admin.name, action: "UPDATE", entity: "settings", details: "Updated platform settings: SMTP configuration saved", ipAddress: "192.168.1.1" },
  ]);

  console.log("Notifications & audit logs seeded");

  // Settings
  await db.insert(settingsTable).values({
    platformName: "ReviewFlow Pro",
    primaryColor: "#8B4A1F",
    googleApiEnabled: false,
  });

  console.log("Settings seeded");
  console.log("\nSeed complete.");
  console.log("Login: paramesh.paidakula@gmail.com / Advento@2026  (super_admin)");
  console.log("       sarah@reviewflowpro.com       / manager123       (manager)");
  console.log("       james@reviewflowpro.com       / manager123       (manager)");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
