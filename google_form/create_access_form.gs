/**
 * Creates the "Octo dataset – CAVE / CATMAID access request" Google Form,
 * a linked response spreadsheet, and (optionally) an email alert per request.
 *
 * HOW TO RUN (one time, ~2 minutes):
 *   1. Go to https://script.google.com  ->  New project.
 *   2. Delete the placeholder code, paste this whole file, and Save.
 *   3. Edit NOTIFY_EMAIL below (or leave "" for no email alerts).
 *   4. Select the function `createAccessForm` in the toolbar and click Run.
 *      Approve the permissions prompt (Forms, Sheets, Gmail for alerts).
 *   5. Open View -> Logs (or "Execution log"). Copy the "PUBLIC FORM URL"
 *      into assets/js/config.js -> accessForm, then run scripts/deploy.sh.
 *
 * The form and spreadsheet appear in your Google Drive; edit questions there
 * any time. The page link keeps working after edits.
 */

// ── Settings ────────────────────────────────────────────────────────────────
var NOTIFY_EMAIL = "sm2667@cam.ac.uk";   // e.g. "you@example.org". Gets an email for each new request. "" = off.
var FORM_TITLE   = "Octo dataset – CAVE / CATMAID access request";
var PAPER_URL    = "https://www.biorxiv.org/content/10.64898/2026.09.28.754924v1";
// ────────────────────────────────────────────────────────────────────────────

function createAccessForm() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(
    "Request access to the Octo whole-CNS dataset of a first-instar female Drosophila larva " +
    "for proofreading (CAVE) or skeleton tracing (CATMAID).\n\n" +
    "Paper: " + PAPER_URL + "\n\n" +
    "The EM volume and automated segmentations can already be viewed in Neuroglancer " +
    "without an account. This form is only for proofreading or tracing access."
  );
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);
  form.setConfirmationMessage(
    "Thanks! We've received your request and will reply by email, usually within a few working days."
  );

  var emailCheck = FormApp.createTextValidation()
    .setHelpText("Please enter a valid email address.")
    .requireTextIsEmail()
    .build();

  // ── About you ──
  form.addSectionHeaderItem().setTitle("About you");
  form.addTextItem().setTitle("Full name").setRequired(true);
  form.addTextItem().setTitle("Institution / organisation").setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle("Position")
    .setChoiceValues(["PI / group leader", "Postdoc / research scientist",
                      "PhD student", "Master's / undergraduate student", "Research staff / engineer"])
    .showOtherOption(true)
    .setRequired(true);
  form.addTextItem()
    .setTitle("Supervisor / PI name")
    .setHelpText("Leave blank if you are the PI.");
  form.addTextItem()
    .setTitle("Lab or personal website")
    .setHelpText("Optional.");

  // ── Access ──
  form.addSectionHeaderItem().setTitle("Access requested");
  form.addCheckboxItem()
    .setTitle("Which platform(s) do you need?")
    .setChoiceValues([
      "CAVE (proofreading the segmentation, synapse tables)",
      "CATMAID (skeleton tracing and annotation)"
    ])
    .setRequired(true);
  form.addTextItem()
    .setTitle("Google account email for CAVE sign-in")
    .setHelpText("CAVE uses Google sign-in. Give the Gmail or Google Workspace address you will log in with.")
    .setValidation(emailCheck);
  form.addMultipleChoiceItem()
    .setTitle("Have you used CAVE or CATMAID before?")
    .setChoiceValues(["Yes, both", "Yes, CAVE", "Yes, CATMAID", "No, I'm new to both"])
    .setRequired(true);

  // ── Project ──
  form.addSectionHeaderItem().setTitle("Your project");
  form.addParagraphTextItem()
    .setTitle("What do you plan to do with the data?")
    .setHelpText("A few sentences: neurons, circuits or brain regions of interest, and the questions you want to answer.")
    .setRequired(true);
  form.addTextItem()
    .setTitle("Roughly how many people in your group need accounts?")
    .setValidation(FormApp.createTextValidation()
      .setHelpText("Please enter a number.")
      .requireNumberGreaterThan(0).build());

  // ── Terms ──
  form.addSectionHeaderItem().setTitle("Terms of use");
  form.addCheckboxItem()
    .setTitle("Please confirm")
    .setChoiceValues([
      "I will cite the Octo paper in any work that uses the data.",
      "I will not redistribute proofreading credentials or bulk-export the dataset without permission.",
      "I understand the segmentation is largely unproofread and may contain errors."
    ])
    .setValidation(FormApp.createCheckboxValidation()
      .setHelpText("Please tick all three boxes.")
      .requireSelectExactly(3).build())
    .setRequired(true);
  form.addParagraphTextItem().setTitle("Anything else we should know?");

  // Response spreadsheet
  var ss = SpreadsheetApp.create(FORM_TITLE + " (responses)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Newer Forms can start unpublished. Publish if the API supports it.
  try { form.setPublished(true); } catch (e) { /* older runtime: already published */ }
  form.setAcceptingResponses(true);

  // Optional email alert on each submission
  if (NOTIFY_EMAIL) {
    PropertiesService.getScriptProperties().setProperty("NOTIFY_EMAIL", NOTIFY_EMAIL);
    ScriptApp.newTrigger("onAccessRequest").forForm(form).onFormSubmit().create();
  }

  Logger.log("PUBLIC FORM URL (put in config.js): " + form.getPublishedUrl());
  Logger.log("Edit form:                         " + form.getEditUrl());
  Logger.log("Responses spreadsheet:             " + ss.getUrl());
}

/** Emails NOTIFY_EMAIL a summary of each new request. */
function onAccessRequest(e) {
  var to = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (!to) return;
  var r = e.response;
  var lines = ["Submitted by: " + r.getRespondentEmail(), ""];
  r.getItemResponses().forEach(function (ir) {
    var v = ir.getResponse();
    lines.push(ir.getItem().getTitle() + ":\n  " + (Array.isArray(v) ? v.join("; ") : v));
  });
  var name = r.getItemResponses()[0] ? r.getItemResponses()[0].getResponse() : "";
  MailApp.sendEmail({
    to: to,
    replyTo: r.getRespondentEmail(),
    subject: "[Octo access request] " + name,
    body: lines.join("\n")
  });
}
