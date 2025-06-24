# Modular DAO Factory Demo

## System Overview: Modular DAO Factory

This project is a Modular DAO Factory—a system that lets anyone create their own decentralized organization (DAO) on Ethereum, with customizable features. Think of it as a "DAO builder" where you can pick and choose what your DAO can do by plugging in different modules.

### How does it work?

- **Factory Contract:** The "factory" is a smart contract that creates new DAOs for users. Each DAO is a lightweight proxy contract (using the OpenZeppelin Clones pattern) that delegates its logic to a chosen module.
- **DAO Kernel:** This is the core logic contract for each DAO. It handles initialization and delegates all function calls to the selected module.
- **Modules:** These are plug-and-play contracts that define what a DAO can do. For example, a module could manage members, handle voting, or track a counter.
- **Template Catalog:** A registry where available modules are listed, so users can easily select which module to use when creating a DAO.

### Why is this powerful?

- **Modularity:** You can add new features to DAOs by creating new modules, without changing the factory or kernel.
- **Upgradeability:** Each DAO is a proxy, so its logic can be upgraded by changing the module it points to.
- **Safety:** The system uses EIP-1967 storage slot conventions to prevent storage collisions, making it robust and compatible with Ethereum standards.

## MemberModule Documentation

The MemberModule is a smart contract module that gives a DAO the ability to manage its members and their roles. It's the main example module in this system, showing how DAOs can handle membership, admin rights, and join requests.

### Key Features

- **Role-based Access:** There are two main roles: Admin and Member. Admins have special permissions.
- **Join Requests:** Anyone can request to join the DAO. Admins review and accept or reject these requests.
- **Admin Actions:** Only admins can:
  - Accept or reject join requests
  - Add or remove members
  - Change a member's role (promote/demote)
- **Initializer:** The first admin is set via an `init(address)` function, which must be called after the DAO is created.

### How does it work?

1. **Initialization:**  After a DAO is created with the MemberModule, the `init(address)` function must be called (usually by the deployer) to set the first admin.
2. **Requesting to Join:**  Any Ethereum address can call `requestToJoin()` to ask to become a member. Their request is added to a pending list.
3. **Handling Requests:**  Admins can:
   - Call `acceptRequest(address, Role)` to approve a request and assign a role (Admin or Member).
   - Call `rejectRequest(address)` to deny a request.
4. **Managing Members:**  Admins can remove members with `removeMember(address)`. Admins can change a member's role with `changeRole(address, Role)`.
5. **Viewing Members and Requests:**  `getMembers()` returns all current members (including admins). `getJoinRequests()` returns all pending join requests.

### Example Usage

- **User wants to join:**  Calls `requestToJoin()`.
- **Admin reviews requests:**  Calls `getJoinRequests()`, then `acceptRequest(user, Role.Member)` or `rejectRequest(user)`.
- **Admin wants to promote a member:**  Calls `changeRole(member, Role.Admin)`.

### Security Note

- Only addresses with the Admin role can perform admin actions.
- The first admin must be set after deployment using the `init` function.

---

## Overview

- **DaoFactory**: Deploys new DAO instances (proxies) using OpenZeppelin's Clones, initializing them with a chosen module.
- **DaoKernel**: The core logic for each DAO instance, handling initialization and delegating calls to its module.
- **Modules**: Pluggable contracts that provide specific functionality to DAOs. The main example is now the `MemberModule` for role-based membership management.
- **TemplateCatalog**: Registry for available modules, allowing easy lookup and selection when creating new DAOs.

## Architecture

```
User → DaoFactory → (Clones) → DaoKernel (Proxy) → Module (Logic)
```
- Each DAO is a minimal proxy (clone) of the `DaoKernel` implementation.
- The kernel delegates calls to a selected module, enabling modular and upgradable DAOs.

## EIP-1967 Storage Slots

This project uses [EIP-1967](https://eips.ethereum.org/EIPS/eip-1967) storage slot conventions for storing important addresses (such as the factory and module addresses) in the proxy's storage. This approach:
- Prevents storage collisions in upgradeable/proxy contracts.
- Ensures compatibility with tools and standards in the Ethereum ecosystem.
- Uses slots derived from `bytes32(uint256(keccak256('eip1967.proxy.<name>')) - 1)` for uniqueness and safety.

## Main Example: MemberModule

The `MemberModule` is a robust example of a DAO module that supports:
- **Role-based access control**: Admins and Members (with an enum for roles).
- **Join requests**: Anyone can request to join; admins can accept or reject requests.
- **Admin actions**: Only admins can add/remove members, accept/reject join requests, and change roles.
- **Role management**: Admins can promote/demote members.
- **Initializer**: The first admin is set via an `init(address)` function after proxy deployment.

This module demonstrates how DAOs can manage their own membership and governance logic in a modular, upgradeable way.

## Other Example Modules (Legacy)

- `GreetingModule`: Allows setting and retrieving a greeting message.
- `CounterModule`: Allows incrementing and retrieving a counter value.

These modules are included for demonstration and testing purposes, but the main focus is now on the more advanced `MemberModule`.

## Quickstart

### Prerequisites
- Node.js (v16+ recommended)
- npm

### Install Dependencies
```bash
npm install
```

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

## Example Usage
The test suite (`test/member.module.test.js`) demonstrates:
- Deploying the kernel, factory, and MemberModule
- Creating a DAO with the MemberModule
- Initializing the DAO with an admin
- Requesting to join, accepting/rejecting requests, and managing roles

Legacy tests for `GreetingModule` and `CounterModule` are also included for reference.

## License
MIT 