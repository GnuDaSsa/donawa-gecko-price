# Contracts

Contracts define the current unit of work before code changes begin.

Each contract should answer:

1. What is being changed right now?
2. What is explicitly out of scope?
3. How will we know it is done?
4. What is the smallest verification that proves progress?

Suggested flow:

1. Update or create a contract.
2. Point `currentContract` in your configured state file at that contract.
3. Implement against the contract.
4. Run verification.
5. Update state and decisions.
