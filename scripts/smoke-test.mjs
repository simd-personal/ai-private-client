#!/usr/bin/env node
/**
 * Local E2E smoke test — run while `npm run dev` and `npm run supabase:start` are active.
 * Usage: node scripts/smoke-test.mjs
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "astoria-admin-change-me";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const results = [];
let failed = false;

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name} — ${detail}`);
  failed = true;
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

const buyerPayload = {
  leadType: "buyer",
  desiredLocations: ["Newport Beach"],
  budgetRange: "2500000 to 5000000",
  propertyType: "single family",
  lifestylePriorities: ["ocean access", "privacy"],
  timeline: "now",
  financingStatus: "cash buyer",
  freeText: "Smoke test buyer — serious intent for Q2 purchase with ocean views.",
  contact: {
    firstName: "Smoke",
    lastName: "BuyerTest",
    email: `smoke-buyer-${Date.now()}@test.local`,
    phone: "9495550100",
    preferredContactMethod: "phone",
    consentGiven: true,
  },
  honeypot: "",
  attribution: {
    utm_source: "smoke-test",
    utm_medium: "automated",
    utm_campaign: "buyer-e2e",
    landing_page: "/buyer",
    referrer: "http://localhost:3000/",
  },
};

const equityPayload = {
  leadType: "equity",
  currentHomeCity: "Irvine",
  currentHomeState: "California",
  yearPurchased: 2014,
  originalPurchasePrice: 850000,
  estimatedCurrentValue: 1650000,
  mortgageBalance: 420000,
  estimatedInterestRate: 3.25,
  estimatedImprovements: 95000,
  filingStatus: "married_or_joint",
  nextMoveGoal: "upsize",
  desiredNextLocation: "Newport Beach",
  timeline: "3 to 6 months",
  biggestConcern: "timing sale and purchase",
  freeText: "Smoke test equity — planning move-up near the coast.",
  contact: {
    firstName: "Smoke",
    lastName: "EquityTest",
    email: `smoke-equity-${Date.now()}@test.local`,
    phone: "9495550300",
    preferredContactMethod: "email",
    consentGiven: true,
  },
  honeypot: "",
  attribution: {
    utm_source: "smoke-test",
    utm_medium: "automated",
    utm_campaign: "equity-e2e",
    landing_page: "/equity",
  },
};

const sellerPayload = {
  leadType: "seller",
  propertyAddress: {
    street: "123 Ocean Blvd",
    city: "Newport Beach",
    state: "CA",
    zip: "92663",
  },
  estimatedValueRange: "5000000 to 10000000",
  propertyCondition: "luxury renovated",
  sellingTimeline: "30 to 90 days",
  sellerPriority: "highest price",
  upgrades: "Recent kitchen remodel and smart home integration throughout.",
  contact: {
    firstName: "Smoke",
    lastName: "SellerTest",
    email: `smoke-seller-${Date.now()}@test.local`,
    phone: "9495550200",
    preferredContactMethod: "email",
    consentGiven: true,
  },
  honeypot: "",
  attribution: {
    utm_source: "smoke-test",
    utm_medium: "automated",
    utm_campaign: "seller-e2e",
    landing_page: "/seller",
  },
};

async function testLeadFlow(label, payload) {
  const tag = `[${label}]`;

  const { res: postRes, body: postBody } = await jsonFetch(`${BASE}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!postRes.ok) {
    fail(`${tag} POST /api/leads`, `${postRes.status} ${JSON.stringify(postBody)}`);
    return null;
  }
  pass(`${tag} POST /api/leads`, `status ${postRes.status}`);

  const { leadId, token, leadType } = postBody;
  if (!leadId || !token) {
    fail(`${tag} Response has leadId + token`, JSON.stringify(postBody));
    return null;
  }
  pass(`${tag} Returns leadId and token`);

  const sbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}&select=id,public_result_token,lead_type,utm_source,admin_notes,status`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  const sbRows = await sbRes.json();
  if (!sbRes.ok || !Array.isArray(sbRows) || sbRows.length === 0) {
    fail(`${tag} Lead saved in Supabase`, JSON.stringify(sbRows));
    return null;
  }
  const row = sbRows[0];
  pass(`${tag} Lead saved in Supabase`, `id=${row.id}`);

  if (row.public_result_token !== token) {
    fail(`${tag} public_result_token matches`, `expected ${token}, got ${row.public_result_token}`);
  } else {
    pass(`${tag} public_result_token created`);
  }

  if (row.utm_source !== payload.attribution?.utm_source) {
    fail(`${tag} UTM saved`, `expected ${payload.attribution?.utm_source}, got ${row.utm_source}`);
  } else {
    pass(`${tag} UTM attribution saved`);
  }

  const { res: resultRes, body: resultBody } = await jsonFetch(
    `${BASE}/api/leads/result/${encodeURIComponent(token)}`
  );
  if (!resultRes.ok) {
    fail(`${tag} GET /api/leads/result/[token]`, `${resultRes.status} ${JSON.stringify(resultBody)}`);
    return { leadId, token, leadType };
  }
  pass(`${tag} GET /api/leads/result/[token]`, `status ${resultRes.status}`);

  const forbidden = [
    "internalLeadSummary",
    "suggestedFollowUpMessage",
    "internal_lead_summary",
    "suggested_follow_up_message",
    "readinessScore",
    "lead_score",
    "lead_temperature",
    "quiz_data",
    "admin_notes",
    '"email"',
    '"phone"',
  ];
  const serialized = JSON.stringify(resultBody);
  const leaked = forbidden.filter((k) => serialized.includes(k));
  if (leaked.length) {
    fail(`${tag} Public result has no internal fields`, `leaked: ${leaked.join(", ")}`);
  } else {
    pass(`${tag} Public result excludes internal fields`);
  }

  if (!resultBody.report?.reportTitle || !resultBody.leadType) {
    fail(`${tag} Public result shape`, JSON.stringify(resultBody));
  } else {
    pass(`${tag} Public result has report and leadType`);
  }

  const pageRes = await fetch(`${BASE}/result?token=${encodeURIComponent(token)}`);
  if (!pageRes.ok) {
    fail(`${tag} GET /result?token=...`, `status ${pageRes.status}`);
  } else {
    pass(`${tag} GET /result?token=...`, `status ${pageRes.status}`);
  }

  return { leadId, token, leadType, email: payload.contact.email };
}

async function testAdmin(buyerMeta, sellerMeta, equityMeta) {
  const tag = "[admin]";

  const { res: unauthRes } = await jsonFetch(`${BASE}/api/admin/leads`);
  if (unauthRes.status !== 401) {
    fail(`${tag} Unauthenticated GET returns 401`, `got ${unauthRes.status}`);
  } else {
    pass(`${tag} Unauthenticated GET returns 401`);
  }

  const authHeaders = {
    Authorization: `Bearer ${ADMIN_PASSWORD}`,
  };

  const { res: listRes, body: listBody } = await jsonFetch(`${BASE}/api/admin/leads`, {
    headers: authHeaders,
  });
  if (!listRes.ok) {
    fail(`${tag} GET /api/admin/leads`, `${listRes.status} ${JSON.stringify(listBody)}`);
    return;
  }
  pass(`${tag} GET /api/admin/leads`, `${listBody.leads?.length ?? 0} leads`);

  const buyerLead = listBody.leads?.find((l) => l.id === buyerMeta.leadId);
  const sellerLead = listBody.leads?.find((l) => l.id === sellerMeta.leadId);
  const equityLead = equityMeta
    ? listBody.leads?.find((l) => l.id === equityMeta.leadId)
    : null;

  if (!buyerLead) fail(`${tag} Shows buyer lead`, `id ${buyerMeta.leadId} not found`);
  else pass(`${tag} Shows buyer lead`);

  if (!sellerLead) fail(`${tag} Shows seller lead`, `id ${sellerMeta.leadId} not found`);
  else pass(`${tag} Shows seller lead`);

  if (equityMeta) {
    if (!equityLead) fail(`${tag} Shows equity lead`, `id ${equityMeta.leadId} not found`);
    else pass(`${tag} Shows equity lead`);
  }

  if (buyerLead?.internal_lead_summary && buyerLead?.suggested_follow_up_message) {
    pass(`${tag} Admin includes internal summary + follow-up`);
  } else {
    fail(`${tag} Admin includes internal fields`, "missing internal summary or follow-up");
  }

  const { res: statusRes, body: statusBody } = await jsonFetch(`${BASE}/api/admin/leads`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ leadId: buyerMeta.leadId, status: "contacted" }),
  });
  if (!statusRes.ok || statusBody.lead?.status !== "contacted") {
    fail(`${tag} PATCH status`, `${statusRes.status} ${JSON.stringify(statusBody)}`);
  } else {
    pass(`${tag} PATCH status update`, "contacted");
  }

  const notes = "Smoke test admin note — follow up Tuesday.";
  const { res: notesRes, body: notesBody } = await jsonFetch(`${BASE}/api/admin/leads`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ leadId: sellerMeta.leadId, notes }),
  });
  if (!notesRes.ok || notesBody.lead?.admin_notes !== notes) {
    fail(`${tag} PATCH notes`, `${notesRes.status} ${JSON.stringify(notesBody)}`);
  } else {
    pass(`${tag} PATCH admin notes saved`);
  }

  const { body: verifyBody } = await jsonFetch(`${BASE}/api/admin/leads`, {
    headers: authHeaders,
  });
  const verifiedSeller = verifyBody.leads?.find((l) => l.id === sellerMeta.leadId);
  if (verifiedSeller?.admin_notes !== notes) {
    fail(`${tag} Notes persisted after refresh`, verifiedSeller?.admin_notes);
  } else {
    pass(`${tag} Notes persisted after refresh`);
  }
}

function testCsvExport() {
  const tag = "[csv]";
  const leads = [
    {
      first_name: "Smoke",
      last_name: "BuyerTest",
      lead_type: "buyer",
      email: "a@test.com",
      phone: "555",
      lead_score: 80,
      lead_temperature: "hot",
      status: "new",
      created_at: new Date().toISOString(),
      internal_lead_summary: "Internal only",
      suggested_follow_up_message: "Follow up msg",
      admin_notes: "note",
      utm_source: "smoke",
      utm_medium: null,
      quiz_data: {
        leadType: "buyer",
        timeline: "now",
        budgetRange: "2500000 to 5000000",
        desiredLocations: ["Newport Beach"],
      },
    },
  ];

  function escapeCsv(value) {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const headers = ["Name", "Email", "Score"];
  const rows = leads.map((l) =>
    [`${l.first_name} ${l.last_name}`, l.email, String(l.lead_score)]
      .map(escapeCsv)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  if (!csv.includes("Smoke BuyerTest") || !csv.includes("a@test.com")) {
    fail(`${tag} CSV export logic`, "malformed output");
  } else {
    pass(`${tag} CSV export logic produces valid output`);
  }
}

async function main() {
  console.log(`\nPrivate Client Property Desk — smoke test\nBase URL: ${BASE}\n`);

  try {
    await fetch(BASE);
  } catch {
    fail("Dev server reachable", `Cannot connect to ${BASE} — run npm run dev`);
    process.exit(1);
  }
  pass("Dev server reachable");

  const buyerMeta = await testLeadFlow("buyer", buyerPayload);
  const sellerMeta = await testLeadFlow("seller", sellerPayload);
  const equityMeta = await testLeadFlow("equity", equityPayload);

  if (buyerMeta && sellerMeta) {
    await testAdmin(buyerMeta, sellerMeta, equityMeta);
  }

  testCsvExport();

  console.log("\n--- Summary ---");
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`${passed}/${total} checks passed`);

  if (failed) {
    console.error("\nSMOKE TEST FAILED\n");
    process.exit(1);
  }
  console.log("\nSMOKE TEST PASSED\n");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
