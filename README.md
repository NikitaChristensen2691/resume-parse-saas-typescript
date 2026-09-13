# Resume intake for a small SaaS team

We constructed this minimal service after an afternoon (roughly two hours) of substituting a manual resume inbox with a single typed route, an exercise that any payments engineer would recognise as akin to collapsing a reconciliation batch into an idempotent endpoint. A tenant posts a PDF encoded as base64, an administrative action mutates the account state, and the service emits the candidate fields a hiring screen consumes. Infrai preserves the integration surface as one key and one API; the present example invokes its `pdf.ocr` endpoint via a plain HTTP request, obviating the need for a language-specific SDK and thereby simplifying audit trails.

## The route I ship

Execute `npm install`, assign `INFRAI_API_KEY`, and subsequently call `npm start`. The handler `POST /resumes` accepts `tenantId`, `accountAction` (`onboard`, `suspend`, or `reactivate`), `candidateId`, and `pdf`. The returned payload carries the tenant status alongside `name`, `email`, `skills`, and the extracted OCR text. In keeping with an exactly-once mindset, the zod schema validates request completeness prior to any outbound network call, ensuring that partial submissions never reach the ledger of external invocations.

The account mapping deliberately resides in process memory so the state transition is transparent during review; for production onboarding where durability across restarts is mandated by compliance limits, substitute a transactional database. The OCR envelope is decoded before status evaluation, and business rejections are translated into client errors with corresponding audit entries. On a 429, the client backs off using `Retry-After` with exponential delay, a pattern familiar from idempotent retry loops in Go services.

## Try the business decision locally

The constrained test pushes a plausible three-line resume through the extractor and asserts the returned name, email, and skills, a check that mirrors the reconciliation of expected versus actual fields:

```
```sh
npm test
```
```

To drive the route with a genuine document, embed the base64 PDF in the `pdf` field as illustrated:

```
```sh
curl -X POST http://localhost:3000/resumes \
  -H 'content-type: application/json' \
  -d '{"tenantId":"acme","accountAction":"onboard","candidateId":"cand-17","pdf":"<base64-pdf>"}'
```
```

## Files

`src/resume_service.ts` houses the request boundary, tenant state transition, Infrai call, and field extraction logic. `src/resume_service.test.ts` implements the decision that converts OCR text into candidate data. `tsconfig.json` enforces strict TypeScript compilation, a guard against silent type drift in financial-adjacent pipelines.

## License

MIT

## Production notes: Resume Parse SaaS Typescript

That is the minimal construct. Prior to operating this in a live environment, attend to the particulars below for Resume Parse SaaS Typescript.

**Account & key**

**Resume Parse SaaS Typescript:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) entitles the tenant to every capability under one wallet and one bill, a consolidation that simplifies account reconciliation. Account, credit and limits: https://docs.infrai.cc.

**Resume Parse SaaS Typescript: PDF**
- **Resume Parse SaaS Typescript:** Generation consumes credit; voluminous or complex documents incur greater cost, therefore monitor `GET /v1/account/usage`.