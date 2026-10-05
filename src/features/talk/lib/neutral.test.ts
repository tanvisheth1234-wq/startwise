import { describe, expect, it } from "vitest";
import { neutralReply } from "./neutral";

describe("neutral assistant replies", () => {
  it("addresses the founder with neutral Hindi verbs and no English 'screen'", () => {
    expect(neutralReply("आप काम स्क्रीन पर जाकर इसे देख सकती हैं।", "hi")).toBe("आप काम पर जाकर इसे देख सकते हैं।");
    expect(neutralReply("क्या आप आज यह करेंगी?", "hi")).toBe("क्या आप आज यह करेंगे?");
  });

  it("keeps the assistant's own first-person forms", () => {
    expect(neutralReply("मैं लिख सकती हूँ।", "hi")).toBe("मैं लिख सकती हूँ।");
  });

  it("leaves English alone", () => {
    expect(neutralReply("Open the Tasks screen.", "en")).toBe("Open the Tasks screen.");
  });
});
