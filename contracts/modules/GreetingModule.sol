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
}
