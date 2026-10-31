# Talk track

9 hops, one short paragraph each. The app shows the same text in the talk-track panel: pick a hop (or press the right arrow) and the panel says what to tell the room while the diagram highlights the arrows of that hop.

Presenter mode (the Presenter button, or `P`) hides the intro and enlarges the panel. `→` next, `←` back, `Esc` leaves. The simulation banner and the Mock / Live toggle stay on screen.

1. **Publish once, get it free.** Northwind Air lists its connector in the assistant's catalog once. After that a member adds it from the catalog for free: nothing to install, no account to create. Sign-in and consent come on first use.
2. **Discover.** The agent knocks with no token and gets a 401 that points at the metadata. The door advertises itself; nobody at Northwind Air is involved.
3. **Register.** The agent registers itself with a client document. Now Northwind Air has an identity to name in consent, scope, and switch off.
4. **Consent.** The member signs in at PingOne with a passkey. The consent screen names this agent and what it may do. The member session never enters the agent.
5. **Exchange, per call.** Every tool call gets its own token: subject is the member, actor is the agent, one audience, minutes to live. The agent holds nothing standing.
6. **Call + decide.** The call reaches only the gateway. It checks audience and scope, then asks Authorize for a verdict. Redeeming miles is spending, so the answer is approval required.
7. **Approve.** The approval happens in Northwind Air's own app, naming the exact redemption. One approval, one action, and a timeout means no.
8. **Permit.** Only permitted calls reach the rewards service, which accepts only its own audience. The credentials for the legacy system never leave the Facade.
9. **Log and revoke.** Gateway and authorization server write the same record, in storage the agent cannot touch. Turn off the agent client and its access ends within one token lifetime.

All names come from `customer.config.json` (see `customer.config.example.json`); the text above uses the default cast.
