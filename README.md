# Modular DAO Factory Demo

This project demonstrates a modular, upgradeable DAO (Decentralized Autonomous Organization) factory on Ethereum. It allows users to deploy new DAOs with customizable modules using a factory contract, following modern proxy patterns for efficiency and flexibility.

## Overview

- **DaoFactory**: Deploys new DAO instances (proxies) using OpenZeppelin's Clones, initializing them with a chosen module.
- **DaoKernel**: The core logic for each DAO instance, handling initialization and delegating calls to its module.
- **Modules**: Pluggable contracts (e.g., `GreetingModule`, `CounterModule`) that provide specific functionality to DAOs.
- **TemplateCatalog**: Registry for available modules, allowing easy lookup and selection when creating new DAOs.

## Architecture

```
User → DaoFactory → (Clones) → DaoKernel (Proxy) → Module (Logic)
```
- Each DAO is a minimal proxy (clone) of the `DaoKernel` implementation.
- The kernel delegates calls to a selected module, enabling modular and upgradable DAOs.

## Contracts
- `DaoFactory.sol`: Factory for deploying new DAOs with a selected module.
- `DaoKernel.sol`: Proxy kernel for each DAO, delegates logic to its module.
- `GreetingModule.sol`: Example module for storing and returning a greeting.
- `CounterModule.sol`: Example module for incrementing and retrieving a counter.
- `TemplateCatalog.sol`: Registry for module templates.

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
The test suite (`test/factory.modular.test.js`) demonstrates:
- Deploying the kernel, modules, catalog, and factory
- Registering modules in the catalog
- Creating new DAOs with selected modules
- Interacting with deployed DAOs via their modules

## License
MIT 