# mwoms

## Deploy to Render

This repository is configured as a single Render web service. The backend
serves the built frontend, API, and client-side routes from one public URL.

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. During setup, enter values for `SEED_ADMIN_EMPLOYEE_ID` and
	`SEED_ADMIN_PASSWORD`. Keep the password private and use a strong value.
4. Apply the blueprint. Render provisions PostgreSQL, builds both apps, seeds
	the initial admin account, and starts the service.

The default service URL is `https://mwoms.onrender.com` (or the service name
you choose if that name is unavailable). The health check is available at
`/api/health`.

The blueprint sets `CORS_ORIGIN` for the default service URL. If you rename
the service or add a custom domain, update that environment variable to the exact
public HTTPS origin and redeploy.

## Google Drive employee master

The Employee Master page can sync the workbook's `DR`, `MR`, and `SURFACE DR`
worksheets from Google Drive. No Microsoft app registration is required. Set
`GOOGLE_DRIVE_EMPLOYEE_MASTER_URL` on Render to a Google Drive sharing URL with
**Anyone with the link** viewer access. Both uploaded Excel workbooks and
native Google Sheets are supported. Configure the URL in the Render dashboard
after creating the share link. The app checks the workbook on startup and every
five minutes; admins can also choose **Sync now** on the Employee Master page.

Each employee row needs an ID, name, and designation. DOB and joining date are
optional. The worksheet name determines employee type, grade, and department
(`DR` becomes Daily Rated, `MR` becomes Monthly Rated, and `SURFACE DR` becomes
Surface DR); skill is copied from designation. Experience and due-date columns
are not required. VTC applies only to DR employees and is due five years after
the last VTC date; MR and Surface DR VTC due dates are N/A, and a blank VTC date
stays blank. PME due dates use the employee's current age: under 45, add five
years to the last PME date; ages 45–50, add three years; above age 50, add one
year. PME due dates remain unset when DOB or the last PME date is missing.
Certification status is Expired when the due date is before today, DUE TODAY
when it is today, and VALID when it is later.

**Security warning:** Anyone who gets this link can read the workbook,
including employee personal information. Only enable public link access if
your organization's data-protection policy permits it.

Set `GOOGLE_DRIVE_SYNC_INTERVAL_MINUTES` to change the interval or `0` to
disable scheduled syncs. Matching employees are updated and new employees are
added; rows removed from the file are not deleted or deactivated.
Spreadsheet-owned fields refresh while MWOMS active status and experience
values are preserved.

Admins can correct a source row in the Employee Master sheet preview. These
corrections are stored in MWOMS and reapplied on later syncs; they do not write
back to the Google Drive file.