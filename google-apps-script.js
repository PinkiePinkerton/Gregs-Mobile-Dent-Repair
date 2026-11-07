/**
 * GREG'S MOBILE DENT REPAIR - LEAD ROUTER & DUAL ALERT SYSTEM
 * 
 * Features:
 * - Logs all leads to Google Sheets with Arizona timestamp.
 * - Saves customer dent photos to Google Drive in a dedicated folder.
 * - Embeds clickable photo links in the Google Sheet.
 * - Sends full email alert to BOTH Greg and Chris with photo attachments and reply-to set to customer.
 * - Sends instant SMS alert to Greg's cell phone with 1-tap clickable photo link.
 */

// CONFIGURATION
const RECIPIENT_EMAILS = [
  "greg.napier37@gmail.com",
  "chris@gotsmc.com"
];

// Greg's phone: (602) 316-9263
// Carrier SMS & MMS Gateways (MMS addresses reliably support longer text and clickable URLs):
const GREG_SMS_GATEWAYS = [
  "6023169263@vtext.com",     // Verizon SMS
  "6023169263@vzwpix.com",    // Verizon MMS (supports clickable links)
  "6023169263@tmomail.net",   // T-Mobile MMS/SMS
  "6023169263@txt.att.net",   // AT&T SMS
  "6023169263@mms.att.net"    // AT&T MMS (supports clickable links)
];

// Name of Google Drive folder for saving customer photos
const PHOTO_FOLDER_NAME = "Greg's Dent Repair - Customer Uploads";

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 1. Ensure clean table headers exist on Row 1
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp (AZ)",
        "Customer Name",
        "Phone Number",
        "Email",
        "Vehicle",
        "Dent Description",
        "Photo Uploads",
        "Status"
      ]);
      sheet.getRange(1, 1, 1, 8)
        .setFontWeight("bold")
        .setBackground("#322878")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    // 2. Process photo uploads into Google Drive & email attachments
    var photoLinks = [];
    var photoBlobs = [];
    if (data.photos && data.photos.length > 0) {
      var folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
      for (var i = 0; i < data.photos.length; i++) {
        var photo = data.photos[i];
        if (photo.data) {
          try {
            var decoded = Utilities.base64Decode(photo.data);
            var safeCustomer = (data.name || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
            var filename = safeCustomer + "_" + (photo.filename || ("photo_" + (i + 1) + ".jpg"));
            var blob = Utilities.newBlob(decoded, photo.mimeType || "image/jpeg", filename);
            photoBlobs.push(blob);
            var file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            photoLinks.push(file.getUrl());
          } catch (fileErr) {
            console.error("Photo upload error:", fileErr);
          }
        }
      }
    }

    var photoLinksText = photoLinks.length > 0 ? photoLinks.join("\n") : "None attached";

    // 3. Append lead row to Google Sheet
    var rowData = [
      new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" }),
      data.name || "Unknown",
      data.phone || "",
      data.email || "",
      data.vehicle || "",
      data.description || "",
      photoLinksText,
      "New Lead"
    ];
    sheet.appendRow(rowData);

    // 4. Send full email notification to Greg AND Chris (with clickable links and direct photo attachments)
    sendEmailNotification(data, photoLinks, photoBlobs);

    // 5. Send instant SMS text alert to Greg's phone with 1-tap photo link
    sendSmsNotification(data, photoLinks);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("Webhook error:", err);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function sendEmailNotification(data, photoLinks, photoBlobs) {
  var customerName = data.name || "New Customer";
  var vehicle = data.vehicle || "Vehicle";
  var subject = "⚡ NEW ESTIMATE REQUEST: " + customerName + " (" + vehicle + ")";

  var photoHtml = "";
  if (photoLinks && photoLinks.length > 0) {
    photoHtml = "<p style='margin-top:16px;'><strong>Customer Photos (Also Attached to Email):</strong></p><ul style='margin:4px 0 0 18px;'>";
    for (var i = 0; i < photoLinks.length; i++) {
      photoHtml += '<li style="margin-bottom:6px;"><a href="' + photoLinks[i] + '" target="_blank" style="color:#0077FF; font-weight:bold;">View Full Resolution Photo ' + (i + 1) + '</a></li>';
    }
    photoHtml += "</ul>";
  } else {
    photoHtml = "<p style='margin-top:16px; color:#777;'><em>No photos uploaded.</em></p>";
  }

  var htmlBody = 
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
      '<div style="background-color: #322878; color: #ffffff; padding: 20px; text-align: center;">' +
        '<h2 style="margin: 0; color: #FFA500; font-size: 22px;">⚡ New Virtual Estimate Request</h2>' +
        '<p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Greg\'s Mobile Dent Repair</p>' +
      '</div>' +
      '<div style="padding: 24px; background-color: #ffffff; color: #333333; line-height: 1.6;">' +
        '<table style="width: 100%; border-collapse: collapse;">' +
          '<tr><td style="padding: 8px 0; font-weight: bold; width: 130px; color:#54595F;">Name:</td><td style="padding: 8px 0; font-size:16px; font-weight:bold;">' + (data.name || "N/A") + '</td></tr>' +
          '<tr><td style="padding: 8px 0; font-weight: bold; color:#54595F;">Phone:</td><td style="padding: 8px 0;"><a href="tel:' + (data.phone || "") + '" style="color: #0077FF; font-weight: bold; font-size:16px; text-decoration: none;">' + (data.phone || "N/A") + '</a></td></tr>' +
          '<tr><td style="padding: 8px 0; font-weight: bold; color:#54595F;">Email:</td><td style="padding: 8px 0;"><a href="mailto:' + (data.email || "") + '">' + (data.email || "N/A") + '</a></td></tr>' +
          '<tr><td style="padding: 8px 0; font-weight: bold; color:#54595F;">Vehicle:</td><td style="padding: 8px 0; font-weight: bold; color: #322878; font-size:16px;">' + (data.vehicle || "N/A") + '</td></tr>' +
          '<tr><td style="padding: 8px 0; font-weight: bold; color:#54595F; vertical-align: top;">Dent Details:</td><td style="padding: 10px; background: #F9F9FE; border-radius: 4px; border:1px solid #E2E8F0;">' + (data.description || "N/A") + '</td></tr>' +
        '</table>' +
        photoHtml +
        '<div style="margin-top: 26px; text-align: center;">' +
          '<a href="sms:' + (data.phone || "") + '" style="display: inline-block; background-color: #FFA500; color: #000000; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; margin: 6px;">Tap to Text Customer</a>' +
          '<a href="tel:' + (data.phone || "") + '" style="display: inline-block; background-color: #322878; color: #ffffff; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; margin: 6px;">Tap to Call Customer</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  for (var i = 0; i < RECIPIENT_EMAILS.length; i++) {
    try {
      var mailOptions = {
        to: RECIPIENT_EMAILS[i],
        replyTo: data.email || "",
        subject: subject,
        htmlBody: htmlBody
      };

      if (photoBlobs && photoBlobs.length > 0) {
        mailOptions.attachments = photoBlobs;
      }

      MailApp.sendEmail(mailOptions);
    } catch (err) {
      console.error("Error sending to " + RECIPIENT_EMAILS[i] + ":", err);
    }
  }
}

function sendSmsNotification(data, photoLinks) {
  var name = data.name || "Customer";
  var phone = data.phone || "";
  var vehicle = data.vehicle || "";
  var desc = (data.description || "").substring(0, 35);

  var photoLine = "";
  if (photoLinks && photoLinks.length > 0) {
    photoLine = "\nPhoto: " + photoLinks[0];
  }

  var smsBody = "⚡ NEW DENT LEAD:\n" +
                name + "\n" +
                phone + "\n" +
                vehicle + "\n" +
                desc + (data.description && data.description.length > 35 ? "..." : "") +
                photoLine;

  for (var i = 0; i < GREG_SMS_GATEWAYS.length; i++) {
    try {
      MailApp.sendEmail({
        to: GREG_SMS_GATEWAYS[i],
        subject: "New Lead",
        body: smsBody
      });
    } catch(err) {
      // Ignore individual carrier rejection
    }
  }
}
