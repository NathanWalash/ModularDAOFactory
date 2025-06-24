# MemberModule

## Purpose
The MemberModule provides role-based access control and membership management for a DAO. It supports join requests, admin approval, role assignment, and member removal. It is designed to be used as a module in a modular DAO system (diamond pattern).

## Roles
- **None (0):** Not a member.
- **Member (1):** Regular member, can participate in DAO activities.
- **Admin (2):** Has full control over membership, can accept/reject requests, assign roles, and remove members.

## Key Functions
- `init(bytes data)`: Initializes the module with the first admin (address encoded in `data`).
- `requestToJoin()`: Allows a non-member to request to join the DAO.
- `acceptRequest(address requester, Role role)`: Admin accepts a join request and assigns a role (Member or Admin).
- `rejectRequest(address requester)`: Admin rejects a join request.
- `removeMember(address member)`: Admin removes a member or admin from the DAO.
- `changeRole(address member, Role newRole)`: Admin changes a member's role.
- `getRole(address user)`: Returns the role of a user (0=None, 1=Member, 2=Admin).
- `getMembers()`: Returns all current members (including admins).
- `getJoinRequests()`: Returns all pending join requests.
- `getMemberCount()`: Returns the number of current members.

## Usage Notes
- Only admins can accept/reject join requests, remove members, or change roles.
- The module is intended to be called via the DAO proxy, not directly.
- Integrates with other modules (e.g., ClaimVotingModule) for access control. 