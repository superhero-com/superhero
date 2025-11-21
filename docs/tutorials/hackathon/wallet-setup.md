---
title: Wallet Setup
---

<Info>
Set up Superhero Wallet to create and manage your æternity accounts for development and testing.
</Info>

## Install Superhero Wallet

### Browser Extensions
- **Chrome**: [Superhero Wallet extension](https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne)
- **Firefox**: [Superhero Wallet extension](https://addons.mozilla.org/en-US/firefox/addon/superhero-wallet/)

### Mobile Apps
- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=com.superhero.cordova)
- **iOS**: [App Store](https://apps.apple.com/us/app/superhero-wallet/id1502786641)

<Tip>
Pin the browser extension for quick access.
</Tip>

## Create or Import an Account

1. Open Superhero Wallet
2. Choose **"Create"** to generate a new seed phrase, or **"Import"** to restore an existing one
3. Write down the seed phrase offline and store it securely

<Warning>
Back up your seed phrase. Anyone with your seed can control your account. Never share it or commit it to version control.
</Warning>

## Switch to Testnet

1. Open Wallet settings
2. Select **æternity testnet**
3. Your wallet will now connect to the testnet network

## Fund Your Testnet Account

Get testnet AE tokens for development and testing:

1. Copy your testnet account address from the wallet
2. Visit the [æternity Testnet Faucet](https://faucet.aepps.com/)
3. Paste your address and request tokens

<Tip>
Testnet tokens are free and used only for testing. They have no real value.
</Tip>

## Create a Development Key (Optional)

For automated testing, you can generate a dev key locally:

```bash
# Generate a test keypair
aecli key generate
```

<Warning>
Never commit private keys to version control. Store them in `.env*` files locally only, and add these files to `.gitignore`.
</Warning>

