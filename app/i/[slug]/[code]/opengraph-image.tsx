import { SAMPLE_GUEST_CODE } from "@/modules/guest/server/published";
import { sampleInvitation } from "@/lib/mock-data";

// Personal links share the invitation's link preview image (couple's names and date).
export { default, alt, size, contentType } from "../opengraph-image";

export function generateStaticParams() {
  return [{ slug: sampleInvitation.slug, code: SAMPLE_GUEST_CODE }];
}
