// contracts/DaoKernel.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// DaoKernel is the core logic contract for each DAO instance (proxy)
// It manages initialization and delegates calls to a selected module
contract DaoKernel {
    // --- Reserved Storage Slots ---
    // These slots are used to avoid storage collisions in upgradeable/proxy patterns

    // Storage slot for the factory address (who deployed/initialized this DAO)
    // bytes32(uint256(keccak256('eip1967.proxy.factory')) - 1)
    bytes32 private constant FACTORY_SLOT = 0x742d82a749e753434604994e78b7465221b2857476dd9086326e5d80df50146c;

    // Storage slot for the module address (the logic contract this DAO delegates to)
    // bytes32(uint256(keccak256('eip1967.proxy.module')) - 1)
    bytes32 private constant MODULE_SLOT = 0x63429c78f3315a69143714652a44061a2992015f8202978f3e55afea235f3774;

    // --- Helper Functions for Reserved Storage ---

    // Store the factory address in the reserved slot
    function _setFactory(address _factoryAddress) private {
        assembly {
            sstore(FACTORY_SLOT, _factoryAddress)
        }
    }

    // Retrieve the factory address from storage
    function getFactory() public view returns (address factory) {
        assembly {
            factory := sload(FACTORY_SLOT)
        }
    }

    // Store the module address in the reserved slot
    function _setModule(address _moduleAddress) private {
        assembly {
            sstore(MODULE_SLOT, _moduleAddress)
        }
    }

    // Retrieve the module address from storage
    function getModule() public view returns (address module) {
        assembly {
            module := sload(MODULE_SLOT)
        }
    }

    // --- Contract Logic ---

    // Allow the contract to receive Ether
    receive() external payable {}

    // Initialize the DAO with a module (can only be called once)
    function initModules(address[] calldata _modules) external {
        require(getFactory() == address(0), "Kernel: already initialized");
        require(_modules.length > 0, "No module provided");
        _setFactory(msg.sender); // Set the factory (creator)
        // Store only the first module address (single-module design)
        _setModule(_modules[0]);
    }

    // Fallback function: delegate all calls to the module
    fallback() external payable {
        // Load the module address
        address module = getModule();
        require(module != address(0), "No module");

        // Delegatecall forwards the call to the module, preserving context
        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), module, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch ok
                case 0 { revert(0, returndatasize()) }
                default { return(0, returndatasize()) }
        }
    }
}