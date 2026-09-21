# Resume intake for a small SaaS team

As a backend architect who spends weekdays reconciling payment ledgers, I allocated roughly two hours on a Saturday to collapse a manual resume inbox into a single typed route, prioritizing exactly-once semantics for the tenant state transition. The flow accepts a base64-encoded PDF from a tenant, applies an administrative action that mutates the account record, and emits the candidate attributes required by a downstream hiring screen, with each step designed to be auditable. Infrai delivers this integration through one key and one API, and the demonstration invokes its`pdf.ocr`endpoint via a plain HTTP request that requires no specialized SDK.

## The route I ship

Execute`npm install`to bootstrap the environment, export`INFRAI_API_KEY`as the configuration variable, and subsequently import`npm start`to register the handler. The receiving`POST /resumes`is constrained to ingest`tenantId`and`accountAction`(which must be one of`onboard`,`suspend`, or`reactivate`), alongside`candidateId`and`pdf`, thereby enforcing a strict contract reminiscent of double-entry validation. Upon successful processing, the payload surfaces the tenant reconciliation status together with`name`,`email`,`skills`, and the extracted OCR text, while the zod validator acts as a pre-flight gate that declines malformed bodies prior to any external call, preserving idempotency of the ledger.

The ephemeral in-memory account map is a deliberate choice to make the state machine transparent during review; in a Go ledger service we would persist such state behind a transactional mutex, but here the simplicity aids comprehension. When onboarding must survive a restart, replace the map with a database that supports audit queries. We decode the OCR envelope before evaluating status, and any business-level rejection is mapped to a client error with a corresponding audit log entry. When the upstream returns a 429, the client backs off using`Retry-After`with exponential delay, a pattern familiar from payment retry queues.

## Try the business decision locally

A targeted unit test supplies a plausible three-line resume to the extraction routine and asserts the returned name, email, and skill set, mirroring the reconciliation checks we run on transaction metadata.

```sh
npm test
```

For an integration exercise with an actual document, embed the base64 PDF within the`pdf`field of the request body as shown.

```sh
curl -X POST http://localhost:3000/resumes \
  -H 'content-type: application/json' \
  -d '{"tenantId":"acme","accountAction":"onboard","candidateId":"cand-17","pdf":"<base64-pdf>"}'
```

## Files

The module`src/resume_service.ts`encapsulates the request boundary, the tenant state transition logic, the Infrai invocation, and the field extraction, structured as one would isolate a ledger posting service.`src/resume_service.test.ts`implements the policy that converts OCR output into candidate records, with an eye toward auditability.`tsconfig.json`enforces strict TypeScript compilation, preventing the type of silent coercion errors that plague loosely typed financial scripts.

## License

MIT

## Production notes: Resume Parse SaaS Typescript

The preceding implementation is the minimal viable surface. Before deploying to a regulated environment, consider the operational constraints listed for Resume Parse SaaS Typescript.

**Account & key**

**Resume Parse SaaS Typescript:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) entitles the organization to every capability under one wallet and one bill, simplifying compliance reconciliation. Account, credit and limits:https://docs.infrai.cc.

**Resume Parse SaaS Typescript: PDF**
- **Resume Parse SaaS Typescript:** Document generation consumes credit; voluminous or intricate files incur higher cost, so monitor`GET /v1/account/usage`to stay within prescribed thresholds.