/**
 * Approval workflow for Octo access requests, including Slack invites.
 *
 * What it does
 *   - Adds a "join the Octo Slack?" question to your existing access form.
 *   - Adds two columns to the responses spreadsheet: "Status" (a dropdown:
 *     Pending / Approved / Declined) and "Approval email sent".
 *   - When you set a row's Status to "Approved", it emails that person
 *     automatically. If they asked for Slack, the email includes the Slack
 *     invite link. Each person is emailed only once.
 *
 * Why there is a manual approval step
 *   Slack has no supported API for inviting people to a workspace except on
 *   Enterprise Grid, so a script can't add people to Slack directly. The invite
 *   link is never shown on the website; only people you approve receive it.
 *
 * Setup (one time)
 *   1. Open the SAME Apps Script project where you ran createAccessForm, add a
 *      new script file (+ -> Script), and paste this file into it.
 *   2. Set FORM_EDIT_URL below to the "Edit form" URL from the earlier
 *      execution log (or open the form in Google Forms and copy the address
 *      bar; it ends in /edit).
 *   3. Project Settings (gear icon) -> Script properties -> Add property:
 *        SLACK_INVITE_URL = <your Slack shared invite link>
 *      The link is kept there rather than in this file, because this file is
 *      in the public GitHub repo.
 *   4. Select `setupApproval` and click Run. Approve the permissions prompt.
 *
 * Daily use
 *   Open the responses spreadsheet, review a request, and set Status to
 *   "Approved". The email goes out within a few seconds, and the
 *   "Approval email sent" cell is filled in with the date.
 *
 * If you regenerate the Slack link, update the SLACK_INVITE_URL script property.
 * You don't need to change any code.
 */

// ── Settings ────────────────────────────────────────────────────────────────
var FORM_EDIT_URL  = "";   // https://docs.google.com/forms/d/<id>/edit
var SLACK_QUESTION = "Would you like to join the Octo Slack workspace?";
var STATUS_HEADER  = "Status";
var SENT_HEADER    = "Approval email sent";
var STATUSES       = ["Pending", "Approved", "Declined"];

var EMAIL_SUBJECT  = "Your Octo dataset access request has been approved";
// ────────────────────────────────────────────────────────────────────────────


function setupApproval() {
  if (!FORM_EDIT_URL) throw new Error("Set FORM_EDIT_URL at the top of this file first.");
  if (!getSlackInvite_()) {
    throw new Error("Add the script property SLACK_INVITE_URL first (Project Settings -> Script properties).");
  }

  var form = FormApp.openByUrl(FORM_EDIT_URL);
  addSlackQuestion_(form);

  var ss = SpreadsheetApp.openById(form.getDestinationId());
  var sheet = getResponseSheet_(ss);
  SpreadsheetApp.flush();

  // Add the review columns if they aren't there yet
  var headers = getHeaders_(sheet);
  [STATUS_HEADER, SENT_HEADER].forEach(function (h) {
    if (!findCol_(headers, h)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight("bold");
      headers = getHeaders_(sheet);
    }
  });

  // Status dropdown for every row
  var statusCol = findCol_(headers, STATUS_HEADER);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule);

  // Install the edit trigger once
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === "onReviewEdit";
  });
  if (!exists) ScriptApp.newTrigger("onReviewEdit").forSpreadsheet(ss).onEdit().create();

  Logger.log("Setup complete. Review requests here: " + ss.getUrl());
}


/** Runs on every edit of the responses spreadsheet (installable trigger). */
function onReviewEdit(e) {
  var sheet = e.range.getSheet();
  if (!sheet.getFormUrl()) return;                         // not the responses tab
  var headers = getHeaders_(sheet);
  var statusCol = findCol_(headers, STATUS_HEADER);
  if (!statusCol) return;
  if (e.range.getColumn() > statusCol || e.range.getLastColumn() < statusCol) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    for (var r = Math.max(2, e.range.getRow()); r <= e.range.getLastRow(); r++) {
      processRow_(sheet, headers, r);
    }
  } finally {
    lock.releaseLock();
  }
}


function processRow_(sheet, headers, r) {
  var row = sheet.getRange(r, 1, 1, headers.length).getValues()[0];
  var get = function (name) { var c = findCol_(headers, name); return c ? row[c - 1] : ""; };

  if (String(get(STATUS_HEADER)).trim() !== "Approved") return;
  var sentCol = findCol_(headers, SENT_HEADER);
  if (row[sentCol - 1]) return;                            // already emailed

  var to = String(get("Email Address") || get("Email address")).trim();
  if (!to) return;
  var name      = String(get("Full name")).trim();
  var platforms = String(get("Which platform(s) do you need?")).trim();
  var gAccount  = String(get("Google account email for CAVE sign-in")).trim();
  var wantSlack = /^yes/i.test(String(get(SLACK_QUESTION)));

  var lines = [
    "Hi " + (name.split(" ")[0] || "there") + ",",
    "",
    "Thanks for your interest in the Octo dataset. Your access request has been approved.",
    ""
  ];
  if (platforms) {
    lines.push("Platform(s): " + platforms);
    if (gAccount) lines.push("Google account for CAVE: " + gAccount);
    lines.push("We will set up your account(s) and send login details and a short " +
               "proofreading guide in a separate email.", "");
  }
  if (wantSlack) {
    lines.push("Join the Octo Slack workspace here:",
               getSlackInvite_(),
               "Please don't share this link. It is only for approved users.", "");
  }
  lines.push("Best wishes,", "The Octo team");

  MailApp.sendEmail({ to: to, subject: EMAIL_SUBJECT, body: lines.join("\n") });
  sheet.getRange(r, sentCol).setValue(new Date());
}


// ── Helpers ─────────────────────────────────────────────────────────────────

function addSlackQuestion_(form) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === SLACK_QUESTION) return;    // already added
  }
  var q = form.addMultipleChoiceItem()
    .setTitle(SLACK_QUESTION)
    .setHelpText("Slack is where we answer questions, report segmentation errors and " +
                 "coordinate proofreading. Approved users receive an invite by email.")
    .setChoiceValues(["Yes", "No"])
    .setRequired(true);

  // Put it just before the "Terms of use" section, if that exists
  items = form.getItems();
  for (var j = 0; j < items.length; j++) {
    if (items[j].getType() === FormApp.ItemType.SECTION_HEADER &&
        items[j].getTitle() === "Terms of use") {
      form.moveItem(q.getIndex(), j);
      break;
    }
  }
}

function getResponseSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) if (sheets[i].getFormUrl()) return sheets[i];
  throw new Error("No form-linked sheet found in " + ss.getUrl());
}

function getHeaders_(sheet) {
  var n = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, 1, n).getValues()[0].map(String);
}

/** 1-based column index of the header (case-insensitive), or 0. */
function findCol_(headers, name) {
  var want = name.toLowerCase().trim();
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase().trim() === want) return i + 1;
  }
  return 0;
}

function getSlackInvite_() {
  return PropertiesService.getScriptProperties().getProperty("SLACK_INVITE_URL");
}
