# InsoMail changes, October 29, 2026

Based on Mailflare v0.5.3, upstream commit 2b4c479904d396db3e4f690731d62e6c7f380c99.
This modified version remains under GNU AGPL version 3. The LICENSE and upstream credits remain.

- InsoMail's local capability policy permits admin-created accounts without an application seat cap. It does not assert an active Pro or Team license or contact a license service to claim one.
- Existing authorization, private inbox ownership, closed public registration and password handling remain. Professional and Team are free local InsoMail plans. Users select their own plan; no checkout, paid license claim or role change occurs. Team enables delegated shared inbox access and admin-selected booking hosts. Global branding and administration remain restricted to their existing roles.
- Every network user can download this version's corresponding source using the Source code link in the sidebar. Large archive downloads stream directly from the Worker with an explicit byte length, without sign-in, including from public booking pages. The archive excludes secrets, database contents, uploaded mail and build artifacts.
- Application account count does not remove infrastructure, storage or sending quotas or billing.

## Build and deploy

Use Node.js 24 or a compatible current Node.js release. Run `npm ci` and `npm run build`.
The lockfile records exact dependencies. The configuration is `wrangler.jsonc`.
To deploy your own instance, replace the Cloudflare account and D1 database identifiers and custom domain with your own, provision the configured R2 bucket, queues and database, then run `npx wrangler deploy` with your Cloudflare credentials.
Runtime credentials such as CF_TOKEN and RESEND_API_KEY must be separately supplied as Worker secrets, never committed. See docs/deployment.md and docs/providers.md for initial setup and permissions.

## Source archive maintenance

After committing a change, run `node scripts/build-insomail-source.mjs`. It packages tracked source files, including this notice, all migration files, dependencies lockfile and build scripts, but excludes repository metadata and generated files. Upload the archive to the private BUCKET under the configured INSOMAIL_SOURCE_KEY before deploying the matching Worker. Use a fresh key per release and update wrangler.jsonc before committing. Never package `.env`, `.dev.vars`, database exports, credentials, mail data or node_modules. Keep the public source download working for all network users.

## Maintenance policy

InsoMail intentionally uses reviewed manual updates. The upstream one-click workflow replaces the full tracked tree and can discard local changes, so it is replaced with a non-mutating notice and its app dispatch endpoint is disabled. GitHub updater credentials are optional and are not needed for mail or free plans. Keep database migration checks separate. Review and merge upstream changes, run tests, rebuild the source archive, and deploy the reviewed InsoMail revision.

## Product identity and notices

Active-plan badges show the selected per-user plan; Plans remains a neutral navigation label. Product copy uses saved instance branding. A prominent About & License link consolidates the preserved Mailflare copyright, modification notice, no-warranty and redistribution information and full AGPL text. Source download remains directly available on signed-in, login and public booking surfaces.
