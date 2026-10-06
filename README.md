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

## OneDrive employee master

The Employee Master page syncs the workbook's `DR`, `MR`, and `SURFACE DR`
worksheets directly from its sharing link. No Entra app registration is
required. In OneDrive, create a link with **Anyone with the link can view**
access, then set `ONEDRIVE_EMPLOYEE_MASTER_URL` on Render to that link (the
default link currently requires sign-in). The app checks the workbook on
startup and every five minutes; admins can also choose **Sync now** on the
Employee Master page.

**Security warning:** Anyone who gets this link can read the workbook,
including employee personal information. Do not enable anonymous link access
unless your organization's data-protection policy permits it. The current
link redirects anonymous visitors to Microsoft sign-in, so syncing will not
work until its access setting is changed.

Set `ONEDRIVE_SYNC_INTERVAL_MINUTES` to change the interval or `0` to disable
scheduled syncs. Override the shared workbook URL with
`ONEDRIVE_EMPLOYEE_MASTER_URL` if needed. Matching employees are updated and
new employees are added; rows removed from Excel are not deleted or
deactivated. Spreadsheet-owned fields refresh while MWOMS active status and
experience values are preserved.