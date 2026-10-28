# ADR-004: Email + password with opaque sessions; guest sessions for samples

**Decision:** argon2id password hashes; a random 32-byte session token in an httpOnly cookie, stored only
as its SHA-256; guests get a session for sample cases. **Why:** revocable on logout, no signing secret
to manage, same ownership model for guests and users. **Supersedes:** Google sign-in + Next-minted JWT.
