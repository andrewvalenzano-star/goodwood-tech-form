# Connecting the form to the Google Sheet

About 10 minutes, once. Do it on a computer (not a phone), signed in to the Google account that owns the Sheet.

## 1. Add the script to the Sheet

1. Open the **Tech Submissions** Sheet.
2. Menu: **Extensions → Apps Script**. A new tab opens with a code editor.
3. Click **Untitled project** at the top and rename it **Tech form backend**.
4. Delete everything in the editor, then paste in the whole of `apps-script/Code.gs` from this repo.
5. Click the **Save** icon (💾).

## 2. Run setup once (gives the script permission)

1. In the toolbar's function dropdown (next to **Debug**), pick **setup**, then click **Run**.
2. Click **Review permissions** and choose your Google account.
3. You'll see **"Google hasn't verified this app."** That's expected: it's your own script, not a published app. Click **Advanced → Go to Tech form backend (unsafe)**, then **Allow**.
4. The log should end with "Execution completed". Back in the Sheet, the first tab is now called **Submissions** with a black header row, and a **Tech Submission Photos** folder has appeared next to the Sheet in Drive.

## 3. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Set:
   - Description: `Tech form v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, then copy the **Web app URL** (ends in `/exec`).
5. Paste that URL into `endpointUrl` in `js/config.js` (or send it to Claude).

"Anyone" means anyone with the link can *submit* a form. Nobody can read the Sheet or the photos unless you share them.

## Changing the script later

Edit the code, save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. (A *New deployment* would make a new URL and the form would stop reaching the Sheet until config.js is updated.)

## Moving to the Goodwood Kartways Google account

1. Signed in to the Goodwood account, open the Sheet and do **File → Make a copy**. The script comes with the copy.
2. In the copy, do steps 2 and 3 above. Setup makes a fresh photo folder in Goodwood's Drive.
3. Put the new URL in `js/config.js`. The form's own address and QR codes don't change.
4. Old photo links in copied rows still point to the original Drive. Either share that photo folder with the Goodwood account or move it across.

If the Goodwood account is a paid Google Workspace account and "Anyone" isn't offered under "Who has access", the admin has blocked public web apps. Ask them to allow it, or keep the backend on a free Gmail account that Goodwood owns.
