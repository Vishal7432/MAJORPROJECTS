# Deploying to Render

This project can be deployed as a Render web service using the repository's
`render.yaml` Blueprint.

## Setup

1. Push the project to GitHub. Do not commit `.env`; it contains local secrets
   and is ignored by Git.
2. Create a MongoDB Atlas database and database user. In Atlas Network Access,
   allow connections from your Render service. Prefer Render's outbound IP
   addresses when your plan provides them; only use a broad IP rule if you
   understand the exposure and cannot use a narrower rule.
3. In the Render Dashboard, choose **New → Blueprint**, connect the GitHub
   repository, and apply the Blueprint.
4. Enter the Atlas connection string for `ATLASDB_URL` when prompted. Keep its
   username and password URL-encoded if they contain special characters.
   Render generates `SECRET` for the service.
5. Wait for the first deployment, then open the service URL.

## Optional integrations

Set these in the Render service's **Environment** settings if the corresponding
features are needed:

- `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET` for listing image
  uploads.
- `MAP_TOKEN` for listing maps.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for booking payments. Start with
  Razorpay test credentials and switch to live credentials only after testing.

Render provides `PORT` automatically. The application uses it and enables
production session-cookie settings when `NODE_ENV=production`.
