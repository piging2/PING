async function main() {
  const { getSiteBundle } = await import("./src/fyd/media/site-bundle");
  const b = await getSiteBundle("happy-place");
  console.log("bundle ok:", !!b, "fieldConflicts:", JSON.stringify(b?.fieldConflicts ?? null));
}
main().catch((e) => { console.error("FAIL:", String(e).slice(0, 300)); process.exit(1); });
