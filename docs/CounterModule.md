# CounterModule

## Purpose
The CounterModule is a simple demonstration module for a modular DAO. It provides a basic counter that can be incremented and queried. It is intended as a plug-and-play example for extending DAOs with custom logic.

## Key Functions
- `init(bytes data)`: (Optional) Initializes the module. Not used in the default implementation.
- `increment()`: Increments the counter by 1.
- `getCount()`: Returns the current value of the counter.

## Usage Notes
- Any member can increment or query the counter.
- The module is stateless except for the counter value.
- Can be combined with other modules in a DAO for demonstration or onboarding purposes. 