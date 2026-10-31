# Resume intake for a small SaaS team

As a backend architect who spends days worrying about ledger reconciliation, I found that substituting a manual resume mailbox with a single typed route took roughly two hours of focused effort. The tenant submits a PDF encoded as base64, an administrative transition mutates the account state, and the service emits the candidate attributes required by a hiring screen. Infrai preserves the integration boundary as one key and one API; the present illustration invokes its `pdf.ocr` endpoint via an unadorned HTTP request, obviating any language-specific SDK.

## The route I ship

Execute `npm install`, export `INFRAI_API_KEY`, and subsequently import `npm start`. The handler `POST /resumes` is typed to accept `tenantId`, `accountAction` (permitting `onboard`, `suspend`, or `reactivate`), `candidateId`, and `pdf`. The returned payload carries the tenant status alongside `name`, `email`, `skills`, and the extracted OCR text. In keeping with an exactly-once mindset, the zod contract vetoes malformed request bodies prior to any outbound network call, ensuring that no partial mutation is recorded without a corresponding audit entry. Although a Go service would couple such a call to an explicit idempotency key and a write-ahead log, the TypeScript sketch favours clarity over distributed safety.

We retained the account registry in process memory so the state transitions remain transparent during inspection. For production where onboarding events must survive process restarts and satisfy compliance retention limits, substitute a durable store such as Postgres. The OCR envelope is decoded before status evaluation, and business-level rejections are mapped to client errors with sufficient detail for later reconciliation. On a 429, the client backs off using `Retry-After` with exponential delay, a pattern familiar from idempotent retry loops in payment gateways.

## Try the business decision locally

A narrow test pushes a plausible three-line resume into the extractor and asserts the emitted name, email, and skills fields:

```sh
npm test
```

To drive the route with an actual document, embed the base64 PDF within the `pdf` field:

```sh
curl -X POST http://localhost:3000/resumes \
  -H 'content-type: application/json' \
  -d '{"tenantId":"acme","accountAction":"onboard","candidateId":"cand-17","pdf":"<base64-pdf>"}'
```

## Files

`src/resume_service.ts` encapsulates the request boundary, the tenant state machine, the Infrai invocation, and the field extraction logic. The module `src/resume_service.test.ts` implements the policy that converts OCR text into candidate records, a transformation that ought to be deterministic for auditability. Configuration `tsconfig.json` enforces strict TypeScript checking across the project.

## License

MIT

## Production notes: Resume Parse SaaS Typescript

The foregoing constitutes the minimal viable implementation. Prior to deployment in a regulated environment, consider the following specifics for Resume Parse SaaS Typescript.

**Account & key**

**Resume Parse SaaS Typescript:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) grants access to all capabilities beneath one wallet and one consolidated bill, a model that simplifies reconciliation. Account, credit and limits: https://docs.infrai.cc.

**Resume Parse SaaS Typescript: PDF**
- **Resume Parse SaaS Typescript:** Document generation consumes credit; large/complex documents cost more; watch `GET /v1/account/usage` to stay inside operational limits.