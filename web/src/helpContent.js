// What the Help dialog says. Plain, and as hedged as the rest of the lab (rule 2): what was measured, what is simulated, what is UNVERIFIED.
export const HELP_SECTIONS = [
  {
    heading: "What this lab is",
    body: [
      "A walkthrough of a member's own AI agent reaching an enterprise's MCP door, hop by hop: publish once, discover, register, consent, per-call token exchange, gateway, policy decision, human approval, audit. Nine hops, drawn as a movable sequence diagram with the wire form or a mock token under every message.",
      "Everything here is a teaching value. Every host ends in .example or .invalid, every token is labelled MOCK, and a netguard refuses every outbound connection — a test proves zero attempts."
    ]
  },
  {
    heading: "What is simulated",
    body: [
      "All of it: the story, the hosts, the tokens (read sub, act.client_id, a single aud and a minutes-long lifetime under each message), the consent, the approval, and the W3C traceparent shown for each hop.",
      "The walk mirrors the flow the family built for real against a Privilege gateway, but no real tenant, product or network is involved, and nothing here claims how a specific product version behaves."
    ]
  },
  {
    heading: "How to use the page",
    body: [
      "Talk track: pick a hop to jump to it; the panel says what to tell the room while the diagram highlights that hop's arrows. Simulate walks all the arrows; Speed sets the time per step; the movie reel jumps to any message and shows its wire form, the participants' details and the mock traceparent.",
      "Drag a participant box along the top — its lifeline and arrows move with it. Reset (step bar) or Reset demo (header) puts the boxes back and refits the view. Presenter (the button, or P) hides the intro and enlarges the panel; arrow keys step, Esc leaves. The Workspace field scopes the mock trace: two workspaces never share a trace id, and Reset demo clears only the current one."
    ]
  },
  {
    heading: "Mock and Real",
    body: [
      "Mock is the default and the only story: everything runs in this process with no setup.",
      "The Live button in the header is shown but disabled, with the reason beside it — this walkthrough has no live backend. In this build Real is one live call through the SE PingOne Privilege gateway: the Privilege gateway check card runs one tools/list through the door with an agent access key, then one tools/call probe of a tool no policy grants, so you see the gateway's own refusal shape. The gateway's words come back unaltered (keys scrubbed); the settings keys are AMD_GW_URL, AMD_GW_APPS and AMD_GW_KEY_<NAME>."
    ]
  }
];
