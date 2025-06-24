# GreetingModule

## Purpose
The GreetingModule is a simple demonstration module for a modular DAO. It allows members to set and retrieve a greeting message. It is intended as a plug-and-play example for extending DAOs with custom logic.

## Key Functions
- `init(bytes data)`: (Optional) Initializes the module. Not used in the default implementation.
- `setGreeting(string calldata greeting)`: Sets the greeting message.
- `sayHello()`: Returns the current greeting message.

## Usage Notes
- Any member can set or get the greeting.
- The module is stateless except for the greeting string.
- Can be combined with other modules in a DAO for demonstration or onboarding purposes. 