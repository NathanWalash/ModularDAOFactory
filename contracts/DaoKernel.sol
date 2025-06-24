// contracts/DaoKernel.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// DaoKernel is the core logic contract for each DAO instance (proxy)
// It manages initialization and delegates calls to a selected module
contract DaoKernel {
    // --- Reserved Storage Slots ---
    // EIP-1967 slots for factory and module registry
    bytes32 private constant FACTORY_SLOT = 0x742d82a749e753434604994e78b7465221b2857476dd9086326e5d80df50146c;
    bytes32 private constant MODULE_REGISTRY_SLOT = 0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e;
    bytes32 private constant SELECTOR_TO_MODULE_SLOT = 0x8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e;

    // --- Diamond Storage Pattern ---
    struct SelectorToModule {
        mapping(bytes4 => address) selectorToModule;
    }
    struct ModuleRegistry {
        address[] modules;
    }

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

    function _selectorToModuleStorage() private pure returns (SelectorToModule storage ds) {
        bytes32 slot = SELECTOR_TO_MODULE_SLOT;
        assembly { ds.slot := slot }
    }

    function _moduleRegistryStorage() private pure returns (ModuleRegistry storage ds) {
        bytes32 slot = MODULE_REGISTRY_SLOT;
        assembly { ds.slot := slot }
    }

    // --- Contract Logic ---

    // Allow the contract to receive Ether
    receive() external payable {}

    // Initialize the DAO with modules and their init data
    function initModules(address[] calldata modules, bytes[] calldata initData) external {
        require(getFactory() == address(0), "Kernel: already initialized");
        require(modules.length > 0, "No modules provided");
        require(modules.length == initData.length, "Modules/initData length mismatch");
        _setFactory(msg.sender);
        ModuleRegistry storage reg = _moduleRegistryStorage();
        SelectorToModule storage sel = _selectorToModuleStorage();
        for (uint i = 0; i < modules.length; i++) {
            address module = modules[i];
            reg.modules.push(module);
            // Query the module for its function selectors
            (bool ok, bytes memory selectorsData) = module.staticcall(abi.encodeWithSignature("getSelectors()"));
            require(ok, "Module must implement getSelectors()");
            bytes4[] memory selectors = abi.decode(selectorsData, (bytes4[]));
            for (uint j = 0; j < selectors.length; j++) {
                sel.selectorToModule[selectors[j]] = module;
            }
            // Call init on the module if needed
            if (initData[i].length > 0) {
                (bool success, ) = module.delegatecall(abi.encodeWithSignature("init(bytes)", initData[i]));
                require(success, "Module init failed");
            }
        }
    }

    // Fallback: delegatecall to the correct module based on selector
    fallback() external payable {
        SelectorToModule storage sel = _selectorToModuleStorage();
        address module = sel.selectorToModule[msg.sig];
        require(module != address(0), "No module for selector");
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