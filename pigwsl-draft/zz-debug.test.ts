import { answerAskFyd } from "../../../../../fyd/ask/visitor-answer";
import { getSiteBundle } from "../../../../../fyd/media/site-bundle";
import { startStubJournal, type StubJournal } from "./stub-journal";

let journal: StubJournal;
beforeAll(async () => {
  journal = await startStubJournal();
});
afterAll(async () => {
  await journal.close();
});

test("debug answers 3", async () => {
  const bundle = await getSiteBundle("ping-fyd");
  if (!bundle) throw new Error("no bundle");
  const deps = { loadBundle: (id: string) => (id === "ping-fyd" ? bundle : null) };
  for (const q of [
    "What services does PING offer and what are its business hours?",
    "List PING's services. Also, does it offer financing?",
    "What services does PING offer and where is it located?",
  ]) {
    const out = answerAskFyd({ siteId: "ping-fyd", question: q, mode: "visitor" }, deps);
    console.log("Q: " + q);
    if (!out.ok) {
      console.log("NOT OK " + JSON.stringify(out.error));
      continue;
    }
    console.log("ANSWER: " + out.answer.slice(0, 400));
    console.log("refusal=" + out.refusal);
    console.log("unknowns=" + JSON.stringify((out as any).unknowns));
    console.log("cites=" + out.citations.length);
  }
});
