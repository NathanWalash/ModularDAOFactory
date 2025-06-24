# ClaimVotingModule

## Purpose
The ClaimVotingModule allows DAO members to create claims (requests for funds or actions) and have other members vote to approve or reject them. Claims are finalized when a quorum of approvals or rejections is reached.

## Claim & Voting Process
1. **Create Claim:** Any member can create a claim with a title, amount, and description.
2. **Voting:** Other members (not the claimant) can vote to approve or reject the claim.
3. **Quorum:** When the number of approvals or rejections reaches the set quorum, the claim is finalized as Approved or Rejected.

## Integration
- Uses the MemberModule to check if a user is a member or admin before allowing claim creation or voting.
- Only members (role 1 or 2) can create or vote on claims.
- Claimants cannot vote on their own claims.
- Double voting is prevented.

## Key Functions
- `init(bytes data)`: Initializes the module with the quorum (uint256 encoded in `data`).
- `createClaim(string title, uint256 amount, string description)`: Member creates a new claim.
- `voteOnClaim(uint256 claimId, bool approve)`: Member votes to approve or reject a claim.
- `getClaim(uint256 claimId)`: Returns details of a specific claim.
- `getClaims()`: Returns all claims.
- `getSelectors()`: Returns the function selectors for the module.

## Usage Notes
- Claims are tracked by ID (incremental).
- Once finalized, claims cannot be voted on further.
- Only members can interact; non-members are rejected.
- Designed for use via the DAO proxy.

## Edge Cases
- Non-members cannot create or vote on claims.
- Claimants cannot vote on their own claims.
- Double voting is not allowed.
- Voting on finalized claims is not allowed. 