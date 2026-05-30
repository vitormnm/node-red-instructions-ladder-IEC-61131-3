# @vitormnm/node-red-instructions-ladder-iec-61131-3

A Node-RED node that provides common **IEC 61131-3 Ladder Logic instructions** for building PLC-style logic flows directly inside Node-RED.

## Features

### Contacts

| Instruction | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| NO          | Normally Open contact. Passes execution when the source value is `true`.    |
| NC          | Normally Closed contact. Passes execution when the source value is `false`. |

### Comparison Instructions

| Instruction | Description                  |
| ----------- | ---------------------------- |
| EQ          | Equal (`==`)                 |
| NEQ         | Not Equal (`!=`)             |
| GT          | Greater Than (`>`)           |
| GE          | Greater Than or Equal (`>=`) |
| LT          | Less Than (`<`)              |
| LE          | Less Than or Equal (`<=`)    |

### Math Instructions

| Instruction | Description    |
| ----------- | -------------- |
| ADD         | Addition       |
| SUB         | Subtraction    |
| MUL         | Multiplication |
| DIV         | Division       |
| MOD         | Modulus        |
| ABS         | Absolute value |
| SQR         | Square root    |
| MOV         | Move value     |

### Output Instructions

| Instruction | Description                              |
| ----------- | ---------------------------------------- |
| SET         | Sets the destination variable to `true`  |
| RESET       | Sets the destination variable to `false` |

---

## Supported Data Sources

Input values can be read from:

* `msg`
* `flow`
* `global`
* Numeric constants
* Boolean constants
* String constants

Output values can be written to:

* `msg`
* `flow`
* `global`

---

## Status Display

The node provides a compact real-time status display similar to PLC ladder diagnostics.

Examples:

```text
NO motor_run(true)→TRUE

GT temp(85)>limit(80)→TRUE

ADD a(10)+b(5)→result=15

DIV x(9)/y(0)→÷0ERR

SET →motor=TRUE

RST →alarm=FALSE
```

The status indicator also changes color:

* Green = instruction result is TRUE
* Gray = instruction result is FALSE
* Red = execution error

---

## Example

### Greater Than Comparison

```text
Source A: msg.temperature
Source B: msg.limit

Instruction: GT
```

Input:

```json
{
  "temperature": 85,
  "limit": 80
}
```

Result:

```json
{
  "ladder": {
    "func": "GT",
    "result": true
  }
}
```

---

### Addition

```text
Source A: msg.value1
Source B: msg.value2

Instruction: ADD
Destination: msg.result
```

Input:

```json
{
  "value1": 10,
  "value2": 5
}
```

Output:

```json
{
  "value1": 10,
  "value2": 5,
  "result": 15
}
```

---

## IEC 61131-3 Inspired

This node is inspired by the instruction set commonly found in PLC programming environments implementing the IEC 61131-3 standard.

It allows Node-RED users to create ladder-style logic using familiar industrial automation instructions without requiring a PLC.

---

## Installation

```bash
npm install @vitormnm/node-red-instructions-ladder-iec-61131-3
```

Restart Node-RED after installation.

---

## License

MIT
