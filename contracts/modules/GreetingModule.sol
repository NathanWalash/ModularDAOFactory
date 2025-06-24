// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// GreetingModule is a simple example module for a DAO
// It allows setting and retrieving a greeting message
contract GreetingModule {
    // The greeting message state variable
    string public greeting;

    // Set the greeting message
    function setGreeting(string calldata g) external { greeting = g; }

    // Retrieve the current greeting message
    function sayHello() external view returns (string memory) { return greeting; }

    // Standard Diamond interface: return function selectors
    function getSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = this.setGreeting.selector;
        selectors[1] = this.sayHello.selector;
    }

    // No-op Diamond-compatible init
    function init(bytes calldata) external {}
}
