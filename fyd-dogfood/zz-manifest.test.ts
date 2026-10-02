/** TEMPORARY: verify the ping-fyd media manifest passes production-truth validation. */
import { getPipelineManifest } from "@/fyd/media/bundle-media";
import { heroMediaFor } from "@/fyd/media/select";
import { getPingObjectGraphSync } from "@/fyd/data/ping-object-source";

test("ping-fyd manifest validates; heroMedia stays null", () => {
  const m = getPipelineManifest("ping-fyd");
  expect(m).not.toBeNull();
  expect(m!.siteId).toBe("ping-fyd");
  expect(m!.media).toEqual([]);
  expect(m!.observations).toHaveLength(1);
  const { graph } = getPingObjectGraphSync("ping-fyd");
  expect(heroMediaFor("ping-fyd", graph, "ping-fyd-business")).toBeNull();
});
