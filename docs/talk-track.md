# Talk track

Nine hops, one sentence of intent each. The app shows the same text in the talk-track panel.

1. **Publish once, get it free.** The company lists its connector in the assistant's catalog once. After that a member adds it from the catalog for free: nothing to install, no account to create. Sign-in and consent come on first use.
2. **Discover.** The agent knocks with no token and gets a 401 that points at the metadata. The door advertises itself.
3. **Register.** The agent registers itself with a client document, so the enterprise has an identity to name, scope and switch off.
4. **Consent.** The member signs in at the identity provider; the consent screen names this agent and what it may do. The member session never enters the agent.
5. **Exchange, per call.** Every tool call gets its own token: subject is the member, actor is the agent, one audience, minutes to live.
6. **Call and decide.** The call reaches only the gateway, which checks audience and scope and asks the policy engine for a verdict. Redeeming miles is spending, so the answer is approval required.
7. **Approve.** The approval happens in the enterprise's own app and names the exact redemption. One approval, one action; a timeout means no.
8. **Permit.** Only permitted calls reach the rewards service, which accepts only its own audience. The credentials for the legacy system never leave the Facade.
9. **Log and revoke.** The gateway and the authorization server write the same record, in storage the agent cannot touch. Disable the agent's client and its access ends within one token lifetime.
