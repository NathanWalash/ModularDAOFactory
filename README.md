# Modular DAO Factory Demo

This project demonstrates a modular, upgradeable DAO (Decentralized Autonomous Organization) factory on Ethereum. It allows users to deploy new DAOs with customizable modules using a factory contract, following modern proxy patterns for efficiency and flexibility.

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