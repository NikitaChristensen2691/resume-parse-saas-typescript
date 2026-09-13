import assert from "node:assert/strict";
import { extractResume } from "./resume_service.ts";

const resume = extractResume("Ada Lovelace\nada@example.com\nSkills: TypeScript, APIs, SQL");
assert.equal(resume.name, "Ada Lovelace");
assert.equal(resume.email, "ada@example.com");
assert.deepEqual(resume.skills, ["TypeScript", "APIs", "SQL"]);
console.log("resume decision test passed");
