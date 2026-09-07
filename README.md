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

The blueprint sets `CORS_ORIGIN` for the default service URL. If you rename the
service or add a custom domain, update that environment variable to the exact
public HTTPS origin and redeploy.