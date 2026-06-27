---
version: "alpha"
name: "Game Services"
description: "Professional mobile game service storefront for catalog browsing, checkout, order tracking, and admin operations."
colors:
  background: "#F7F1EC"
  surface: "#FFFFFF"
  surface-tint: "#F2E6EF"
  ink: "#2F2937"
  muted: "#675D72"
  primary: "#8D6E63"
  primary-soft: "#B89AC0"
  accent: "#C39A84"
  trust: "#2F7D5B"
  warning: "#B7791F"
  danger: "#B42318"
  line: "#D8C8C0"
  on-primary: "#FFFFFF"
typography:
  display:
    fontFamily: "Inter"
    fontSize: "3.125rem"
    fontWeight: "850"
    lineHeight: "1.12"
    letterSpacing: "0px"
  h1:
    fontFamily: "Inter"
    fontSize: "2.5rem"
    fontWeight: "850"
    lineHeight: "1.18"
    letterSpacing: "0px"
  h2:
    fontFamily: "Inter"
    fontSize: "1.5rem"
    fontWeight: "800"
    lineHeight: "1.25"
    letterSpacing: "0px"
  body:
    fontFamily: "Inter"
    fontSize: "1rem"
    fontWeight: "500"
    lineHeight: "1.65"
    letterSpacing: "0px"
  label:
    fontFamily: "Inter"
    fontSize: "0.8125rem"
    fontWeight: "800"
    lineHeight: "1.2"
    letterSpacing: "0px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  card-service:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "18px"
---

## Overview

Game Services should feel like a premium but practical service counter for mobile game support. The brand is calm, trustworthy, and commercial: warm surfaces, restrained depth, clear prices, and fast paths to search, choose a game, pay, upload a slip, and track an order.

## Colors

The palette uses warm porcelain and muted plum as the base, with bronze as the sales accent and green only for trust/status. Avoid a one-note purple page; use the purple tone as a supporting tint, not the whole identity.

- **Background:** warm and quiet, never pure white.
- **Primary:** bronze-brown for serious commerce and CTA controls.
- **Primary soft:** muted plum for gradients and highlights.
- **Accent:** premium service warmth for prices and dividers.
- **Trust:** reserved for success, warranty, and verified states.
- **Danger:** only for blocking errors or destructive admin actions.

## Typography

Use Inter across the product. Headlines should be strong but not oversized inside cards. Body copy should be readable on mobile, with no negative letter spacing.

## Layout

Public pages should prioritize scanning: search, category controls, catalog, package choice, checkout. Use wide sections with constrained content. Cards should be individual repeated items only. Do not nest cards inside cards.

## Elevation & Depth

Use one soft elevation layer for glass surfaces. Avoid decorative orbs, heavy blur, or busy gradients. Depth should help grouping and click targets, not create a landing-page poster.

## Shapes

Default card radius is 18px for the current glass system, with 12px for buttons and fields. Small pills use full rounding. Do not introduce random radius values.

## Components

- Primary buttons use the bronze-to-plum gradient and must look clickable.
- Secondary buttons are white/tinted with clear borders.
- Game cards show a real image when available, then name, category, platform, and a single package CTA.
- Checkout shows account info, 2FA backup code guidance, exact transfer amount, slip upload, and order ID on success.

## Do's and Don'ts

- Do keep the site service-first, direct, and trustworthy.
- Do use real game images and clear payment states.
- Do keep every CTA legible in both light and dark contexts.
- Don't use unsafe labels such as god mode, cheat, devtool, or hack as customer-facing package value.
- Don't add unused packages or design libraries without tying them to this file or the runtime UI.
