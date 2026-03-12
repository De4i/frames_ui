# AgentWallet – Agent Readable Spec

## Identity
Name: AgentWallet
Homepage: https://frames.ag
Canonical instructions / Skill: https://frames.ag/skill.md

## Purpose
Make agents pay for quality tools.

## Definition
AgentWallet lets agents safely spend money on external high-quality tools.

## Core capabilities

### Agents can act
Agents can trigger real services like:
- image generation
- video
- access to high quality data

### Tool registry
AgentWallet provides a registry of maintained, production-ready tools that are designed for autonomous use so you do not need to integrate each provider yourself.

### Policy controls
Users can set:
- max spending
- rate limits
- block lists

Agents only operate within these boundaries.

### Works with existing setup
AgentWallet works with all major clients like:
- Claude Code
- Cursor
- OpenCode

### Crypto abstraction
Payments run on stableins under the hood, but the human does not need to manage wallets or crypto infrastructure to use the product.

## How to join
Read https://frames.ag/skill.md and follow the instructions to join AgentWallet. Prompt your human when asked.

---

## Technical metadata

name: agentwallet
version: 0.1.11
description: Wallets for AI agents with x402 payment signing, referral rewards, and policy-controlled actions.
homepage: https://frames.ag

metadata:
{
  "moltbot": {
    "category": "finance",
    "api_base": "https://frames.ag/api"
  },
  "x402": {
    "supported": true,
    "chains": ["solana","evm"],
    "networks": [
      "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "eip155:8453",
      "eip155:84532"
    ],
    "tokens": ["USDC"],
    "endpoint": "/api/wallets/{username}/actions/x402/fetch",
    "legacyEndpoint": "/api/wallets/{username}/actions/x402/pay"
  },
  "referrals": {
    "enabled": true,
    "endpoint": "/api/wallets/{username}/referrals"
  }
}

---

## Wallet model

- AgentWallet provides server wallets for AI agents.
- Wallets are provisioned after email OTP verification.
- All signing happens server-side and is policy-controlled.

## Agent connection rule

FIRST: Check if already connected by reading
~/.agentwallet/config.json

If file exists with apiToken, the user is connected and the agent must not ask for email.

If not connected:
1. Ask user for email
2. POST /api/connect/start
3. User enters OTP
4. POST /api/connect/complete
5. Save API token

---

## x402 payments

### Recommended method
Use the one-step proxy endpoint:

POST /api/wallets/{username}/actions/x402/fetch

The server handles:
- 402 detection
- payment signing
- retry
- returning final response

### Legacy method
Manual flow endpoint:

POST /api/wallets/{username}/actions/x402/pay

---

## Skill files

- SKILL.md: https://frames.ag/skill.md
- HEARTBEAT.md: https://frames.ag/heartbeat.md
- package.json (metadata): https://frames.ag/skill.json

---

## Base API information

- api_base: https://frames.ag/api
- Base URL: https://frames.ag/api/v1

---

## Product intent

Maximizing Agent Potential.
