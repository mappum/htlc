let { createHash } = require('crypto')
let { addressHash } = require('coins')

// TODO: put contracts in a queue ordered by timelock maturity time,
//       automatically pay out to Alice address once timelock is passed
//       ?

module.exports = {
  // close an existing HTLC
  onInput (input, tx, state, ctx) {
    // get fields from input
    let {
      contractAddress,
      secret,
      pubkey,
      signature,
      amount
    } = input

    // find existing contract by address
    let contract = state[contractAddress]
    if (contract == null) {
      throw Error(`No HTLC with address "${contractAddress}"`)
    }

    // get fields from contract
    let {
      hash,
      locktime,
      aliceAddress,
      bobAddress
    } = contract

    if (ctx.time < locktime) {
      // chain has not reached locktime, contract can be
      // redeemed by Bob if he has the secret value.

      // must have correct secret
      if (!sha256(secret).equals(hash)) {
        throw Error('Invalid secret')
      }

      // must have Bob's pubkey
      // TODO: address hashing and signature verification from coins
      if (addressHash(pubkey) !== bobAddress) {
        throw Error('Invalid public key')
      }
    } else {
      // locktime has passed, contract pays back to Alice.

      // must have Alice's pubkey
      // TODO: address hashing and signature verification from coins
      if (addressHash(pubkey) !== aliceAddress) {
        throw Error('Invalid public key')
      }=
    }

    // must be signed by the pubkey (Alice or Bob)
    if (!verify(pubkey, signature, tx.sigHash)) {
      throw Error('Invalid signature')
    }

    // we don't need this contract in the state anymore
    delete state[contractAddress]
  },

  // create a new HTLC
  onOutput (output, tx, state, chain) {
    // get fields from output
    let {
      hash,
      locktime,
      aliceAddress,
      bobAddress,
      amount
    } = output

    if (!Buffer.isBuffer(hash) || hash.length !== 32) {
      throw Error('Hash must be a 32-byte Buffer')
    }

    if (!Number.isInteger(locktime)) {
      throw Error('Locktime must be an integer')
    }
    if (locktime > Number.MAX_SAFE_INT) {
      throw Error('Locktime must be < 2^53')
    }
    if (locktime <= ctx.time) {
      throw Error('Locktime must be > current time')
    }

    // add contract to state
    let address = addressHash([ locktime, hash, aliceAddress, bobAddress ].join())
    if (state[address] != null) {
      throw Error('A contract with this address already exists')
    }
    state[address] = {
      hash,
      locktime,
      aliceAddress,
      bobAddress,
      amount
    }
  }
}

function sha256 (data) {
  return createHash('sha256').update(data).digest()
}
