# htlc

Hashed time-lock contracts module for [`coins`](https://github.com/mappum/coins).

## Usage

```bash
npm install htlc
```

**Add the module to your coin:**
```js
let htlc = require('htlc')
let coins = require('coins')
let app = require('lotion')()

app.use(coins({
  initialBalances: {
    'address1': 8000,
    'address2': 8000
  },
  handlers: { htlc }
}))

app.listen(8888)
```

**Bob creates a HTLC in his client:**
```js
let coins = require('coins')
let htlc = require('htlc')

let contract = htlc.create({
  // number of coins
  amount: 1000,

  // hash of secret
  hash: htlc.hash('mysecret'),

  // number of blocks from contract creation until timeout
  locktime: 1000,

  // address of person who redeems contract w/ secret
  aliceAddress: 'address1',

  // address of person who redeems contract after timeout
  bobAddress: 'address2'
})

await wallet.payToContract(contract)

```

**Alice redeems once she has the secret:**
```js
let coins = require('coins')
let htlc = require('htlc')

let redemption = htlc.redeemWithSecret('contractAddress')


```
