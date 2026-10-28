# InsoMail changes, October 29, 2026

Based on Mailflare v0.5.3, upstream commit 2b4c479904d396db3e4f690731d62e6c7f380c99.
This modified version remains under GNU AGPL version 3. The LICENSE and upstream credits remain.

- InsoMail's local account policy permits admin-created accounts without an application seat cap. It does not assert an active Pro or Team license or contact a license service to claim one.
- Existing authorization, private inbox ownership, closed public registration and password handling remain. Shared inboxes, branding and forwarding keep their original feature policies.
- Every signed-in user can download this version's corresponding source using the Source code link in the sidebar. The archive excludes secrets, database contents, uploaded mail and build artifacts.
- Application account count does not remove infrastructure, storage or sending quotas or billing.

## Build and deploy

Use Node.js 24 or a compatible current Node.js release. Run `npm ci` and `npm run build`.
The lockfile records exact dependencies. The configuration is `wrangler.jsonc`.
To deploy your own instance, replace the Cloudflare account and D1 database identifiers and custom domain with your own, provision the configured R2 bucket, queues and database, then run `npx wrangler deploy` with your Cloudflare credentials.
Runtime credentials such as CF_TOKEN and RESEND_API_KEY must be separately supplied as Worker secrets, never committed. See docs/deployment.md and docs/providers.md for initial setup and permissions.

## Source archive maintenance

After committing a change, run `node scripts/build-insomail-source.mjs`. It packages tracked source files, including this notice, all migration files, dependencies lockfile and build scripts, but excludes repository metadata and generated files. Upload the archive to the private BUCKET under the configured INSOMAIL_SOURCE_KEY before deploying the matching Worker. Use a fresh key per release and update wrangler.jsonc before committing. Never package `.env`, `.dev.vars`, database exports, credentials, mail data or node_modules. Keep the authenticated source download working for every app user.
