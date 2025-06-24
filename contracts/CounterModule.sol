// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// CounterModule is a simple example module for a DAO
// It allows incrementing and retrieving a counter value
contract CounterModule {
    // The counter state variable
    uint256 public count;

    // Increment the counter by 1
    function increment() external { count += 1; }

    // Retrieve the current counter value
    function getCount() external view returns (uint256) { return count; }
}
