# Modular DAO Factory Demo

## Overview

This project is a **modular, extensible DAO factory system** built in Solidity, supporting the creation of DAOs with any combination of modules (e.g., membership, greeting, counter, voting, etc.). It uses a proxy-based, Diamond Standard-inspired architecture to allow each DAO to have its own set of modules, with safe, upgradeable storage.

- **DaoFactory**: Deploys new DAOs (as proxies), manages metadata, and tracks all DAOs.
- **DaoKernel**: The core logic for each DAO instance. Delegates calls to modules based on function selector (Diamond pattern).
- **Modules**: Pluggable contracts (e.g., MemberModule, GreetingModule, CounterModule) that provide DAO features. Each module is fully isolated in storage.
- **JSON Templates**: Off-chain templates specify which modules and parameter schemas to use for new DAOs. Templates are generic and do not dictate instance-specific fields.

---

## Architecture & Standards

- **Diamond Pattern (EIP-2535 inspired)**: Each DAO proxy delegates calls to modules based on function selector. Modules must implement `getSelectors()` and `init(bytes)`.
- **Diamond Storage**: Every module that stores state uses a unique storage slot (see CounterModule for example) to prevent storage collisions.
- **Upgradeable/Extensible**: New modules can be added without changing the factory or kernel.
- **Minimal Proxy (Clones)**: DAOs are deployed as minimal proxies for gas efficiency.

---

## User Flow: Creating a DAO

1. **Choose or Define a Template (Off-chain)**
   - Select a JSON template that specifies:
     - `templateName`, `templateDescription` (generic, not instance-specific)
     - List of modules (e.g., MemberModule, GreetingModule, CounterModule)
     - `initParamsSchema`: The required parameters for each module (e.g., admin address, quorum)
     - A unique `templateId` string
   - **Templates do NOT include instance name, description, or public/private status.**

2. **Deploy/Select Module Implementations (On-chain)**
   - Ensure all required modules are deployed on-chain.
   - Map the module names in the template to their deployed contract addresses.

3. **Prompt User for Instance-Specific Fields (UI or API)**
   - The user provides:
     - **Instance name** (e.g., "Solidity Enthusiasts DAO")
     - **Instance description** (e.g., "A DAO for Solidity fans to collaborate and learn")
     - **Public/private** status
     - **Module parameters** as required by the template's `initParamsSchema` (e.g., admin address, quorum)

4. **Prepare Initialization Data (Off-chain)**
   - For each module, encode the user-supplied parameters as ABI-encoded bytes.
     - For MemberModule: `abi.encode(adminAddress)`
     - For modules with no init: just `"0x"`

5. **Call the Factory to Create the DAO (On-chain)**
   - Call `DaoFactory.createDao` with:
     - `address[] modules`: The addresses of the module contracts (in template order)
     - `bytes[] initData`: The ABI-encoded init data for each module (from user input)
     - `string name`, `string description`: User-supplied instance fields
     - `bool isPublic`: User-supplied
     - `string templateId`: From the template

6. **DAO is Deployed and Registered**
   - The factory deploys a new proxy (DAO instance), initializes all modules, and stores the DAO's metadata (including the templateId, name, description, isPublic, and modules) in its registry.
   - The `DaoCreated` event is emitted.

7. **Interact with the DAO**
   - The user (or dapp) can now interact with the DAO via its modules: add members, set greetings, increment counters, etc.
   - The DAO's metadata and templateId can be queried from the factory.

8. **Discover DAOs by Template**
   - Anyone can call `getDaosByTemplate(templateId)` to find all DAOs created from a specific template.

---

## JSON Template Format

Templates are generic and reusable. They do **not** include instance-specific fields.

**Example:**
```json
{
  "templateName": "Community DAO",
  "templateDescription": "A template for a community organization",
  "modules": [
    "MemberModule",
    "GreetingModule",
    "CounterModule"
  ],
  "initParamsSchema": [
    { "admin": "address" },
    {},
    {}
  ],
  "templateId": "community-v1"
}
```
- `modules`: List of module names (must be mapped to deployed addresses in your script/test)
- `initParamsSchema`: List of required user-supplied parameters for each module (e.g., admin address for MemberModule; empty for modules with no init)
- `templateId`: Used to track which template was used for each DAO

---

## Instance Creation: User Input Example

- name: "Solidity Enthusiasts DAO"
- description: "A DAO for Solidity fans to collaborate and learn"
- isPublic: true
- admin: 0x123...

---

## Summary Table

| Field              | In Template | In Instance (User Input) |
|--------------------|-------------|--------------------------|
| templateName       | Yes         | No                       |
| templateDescription| Yes         | No                       |
| modules            | Yes         | No                       |
| initParamsSchema   | Yes         | No                       |
| templateId         | Yes         | No                       |
| name               | No          | Yes                      |
| description        | No          | Yes                      |
| isPublic           | No          | Yes                      |
| module params      | Schema only | Yes (user input)         |

---

## Adding New Modules

1. **Implement the module contract**:
   - Must implement `getSelectors()` (returns all function selectors)
   - Must implement `init(bytes)` (for per-DAO initialization; can be a no-op)
   - If storing state, use a unique storage slot (diamond storage pattern)
2. **Deploy the module**
3. **Add it to your JSON template and deployment script**
4. **Update the template's `initParamsSchema`** to describe the required user input for the new module

---

## Testing & Development

- **Run all tests:**
  ```
  npx hardhat test
  ```
- **Key tests:**
  - Creating DAOs with different module sets
  - Creating DAOs from JSON templates (with user-supplied instance fields)
  - Verifying module functionality and storage isolation
  - Querying DAOs by template

---

## Best Practices & Standards Used

- **Diamond Pattern (EIP-2535 inspired)** for modularity
- **Diamond Storage** for safe, isolated state in modules
- **Minimal Proxy (Clones)** for efficient deployment
- **Off-chain templates** for flexible DAO creation
- **Comprehensive tests** for all core features

---

## Example Usage

- **Create a DAO from a template:**
  - Deploy all modules
  - Map template module names to addresses
  - Prompt user for instance name, description, isPublic, and module params
  - Encode init data (e.g., admin address)
  - Call `factory.createDao(modules, initData, name, description, isPublic, templateId)`
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
- `test/member.module.test.js` — Detailed membership/roles/join-request logic

---

## Extensibility & Advanced Notes

- **Add new modules** by following the diamond storage and selector conventions.
- **Templates** can be managed off-chain and versioned for governance or UI purposes.
- **Frontends** can present users with a library of templates and let them choose instance fields and module params at creation time.
- **DAO upgrades**: The system is designed for extensibility, but module upgrades are not included by default—add upgrade logic if needed.
- **Security**: Always audit new modules for storage safety and access control.

---

## Questions?
Open an issue or check the test suite for more usage examples and patterns. 