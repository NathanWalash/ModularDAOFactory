# Modular DAO Factory Demo

## Overview

This project is a **modular, extensible DAO factory system** built in Solidity, supporting the creation of DAOs with any combination of modules (e.g., membership, greeting, counter, voting, etc.). It uses a proxy-based, Diamond Standard-inspired architecture to allow each DAO to have its own set of modules, with safe, upgradeable storage.

- **DaoFactory**: Deploys new DAOs (as proxies), manages metadata, and tracks all DAOs.
- **DaoKernel**: The core logic for each DAO instance. Delegates calls to modules based on function selector (Diamond pattern).
- **Modules**: Pluggable contracts (e.g., MemberModule, GreetingModule, CounterModule) that provide DAO features. Each module is fully isolated in storage.
- **JSON Templates**: Off-chain templates specify which modules and parameters to use for new DAOs.

---

## Architecture & Standards

- **Diamond Pattern (EIP-2535 inspired)**: Each DAO proxy delegates calls to modules based on function selector. Modules must implement `getSelectors()` and `init(bytes)`.
- **Diamond Storage**: Every module that stores state uses a unique storage slot (see CounterModule for example) to prevent storage collisions.
- **Upgradeable/Extensible**: New modules can be added without changing the factory or kernel.
- **Minimal Proxy (Clones)**: DAOs are deployed as minimal proxies for gas efficiency.

---

## Creating a Multi-Module DAO

1. **Deploy the modules you want to use** (e.g., MemberModule, GreetingModule, CounterModule).
2. **Prepare ABI-encoded init data** for each module (e.g., admin address for MemberModule).
3. **Call `DaoFactory.createDao`** with:
   - `address[] modules`: The module implementation addresses
   - `bytes[] initData`: ABI-encoded init data for each module
   - `string name`, `string description`, `bool isPublic`: DAO metadata

The factory deploys a new proxy, initializes all modules, and stores the DAO in its registry.

---

## JSON Template Format

You can define DAOs off-chain using a JSON template. Example:

```json
{
  "name": "Full Modular DAO",
  "description": "A DAO with Member, Greeting, and Counter modules",
  "isPublic": true,
  "modules": [
    "MemberModule",
    "GreetingModule",
    "CounterModule"
  ],
  "initParams": [
    { "admin": "OWNER" },
    {},
    {}
  ]
}
```
- `modules`: List of module names (must be mapped to deployed addresses in your script/test)
- `initParams`: List of objects/params for each module (e.g., admin address for MemberModule; empty for modules with no init)
- `OWNER` is a placeholder to be replaced with the deployer address in your script/test

**See `test/dao.marketplace.test.js` for a working example of using a template to deploy a DAO.**

---

## Adding New Modules

1. **Implement the module contract**:
   - Must implement `getSelectors()` (returns all function selectors)
   - Must implement `init(bytes)` (for per-DAO initialization; can be a no-op)
   - If storing state, use a unique storage slot (diamond storage pattern)
2. **Deploy the module**
3. **Add it to your JSON template and deployment script**

---

## Testing & Development

- **Run all tests:**
  ```
  npx hardhat test
  ```
- **Key tests:**
  - Creating DAOs with different module sets
  - Creating DAOs from JSON templates
  - Verifying module functionality and storage isolation

---

## Best Practices & Standards Used

- **Diamond Pattern (EIP-2535 inspired)** for modularity
- **Diamond Storage** for safe, isolated state in modules
- **Minimal Proxy (Clones)** for efficient deployment
- **Off-chain templates** for flexible DAO creation
- **Comprehensive tests** for all core features

---

## Example Usage

- **Create a DAO with Member, Greeting, and Counter modules from a template:**
  - Deploy all modules
  - Map template module names to addresses
  - Encode init data (e.g., admin address)
  - Call `factory.createDao(modules, initData, name, description, isPublic)`
  - Interact with the DAO via any of its modules (e.g., add members, set greeting, increment counter)

---

## File Structure

- `contracts/DaoFactory.sol` — Factory and registry
- `contracts/DaoKernel.sol` — Core proxy logic (Diamond pattern)
- `contracts/modules/MemberModule.sol` — Membership & roles (diamond storage)
- `contracts/modules/GreetingModule.sol` — Greeting example (no state)
- `contracts/modules/CounterModule.sol` — Counter example (diamond storage)
- `test/dao_template.json` — Example JSON template
- `test/dao.marketplace.test.js` — Full test suite, including template-driven DAO creation

---

## Questions?
Open an issue or check the test suite for more usage examples and patterns. 