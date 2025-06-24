// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Diamond Storage for CounterModule
library CounterStorage {
    bytes32 constant STORAGE_SLOT = keccak256("dao.counter.module.storage");
    struct Layout {
        uint256 count;
    }
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

// CounterModule is a simple example module for a DAO
// It allows incrementing and retrieving a counter value
contract CounterModule {
    // Increment the counter by 1
    function increment() external { CounterStorage.layout().count += 1; }

    // Retrieve the current counter value
    function getCount() external view returns (uint256) { return CounterStorage.layout().count; }

    // Standard Diamond interface: return function selectors
    function getSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = this.increment.selector;
        selectors[1] = this.getCount.selector;
    }

    // No-op Diamond-compatible init
    function init(bytes calldata) external {}
}
