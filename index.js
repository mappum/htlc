let { createHash } = require('crypto')
let { addressHash } = require('coins')

module.exports = {
  // close an existing HTLC
  onInput (input, tx, state, chain) {
    let { contractAddress, secret, amount } = input

    // find existing contract by address
    let contract = state[contractAddress]
    if (contract == null) {
      throw Error(`No HTLC with address "${contractAddress}"`)
    }
    let { hash, locktime, aliceAddress, bobAddress } = contract

    if (chain.height < locktime) {
      // chain has not reached locktime, contract can be
      // redeemed by Bob if he has the secret value.
      if (!sha256(secret).equals(hash)) {
        throw Error('Invalid secret')
      }

      // check for an output that pays to Bob
      mustPayTo(tx, bobAddress, amount)
    } else {
      // locktime has passed, contract pays back to Alice.
      // check for an output that pays to Alice
      mustPayTo(tx, aliceAddress, amount)
    }

    // we don't need this contract in the state anymore
    delete state[contractAddress]
  },

  // create a new HTLC
  onOutput (contract, tx, state, chain) {
    let { amount, hash, locktime, aliceAddress, bobAddress } = contract

    if (!Buffer.isBuffer(hash) || hash.length !== 32) {
      throw Error('Hash must be a 32-byte Buffer')
    }

    if (!Number.isInteger(locktime)) {
      throw Error('Locktime must be an integer')
    }
    if (locktime <= 0) {
      throw Error('Locktime must be > 0')
    }
    if (locktime > Number.MAX_SAFE_INT) {
      throw Error('Locktime must be < 2^53')
    }
    if (locktime <= chain.height) {
      throw Error('Locktime must be > current chain height')
    }

    // add contract to state
    let address = addressHash([ locktime, hash, aliceAddress, bobAddress ].join())
    if (state[address] != null) {
      throw Error('A contract with this address already exists')
    }
    state[address] = contract
  }
}

function sha256 (data) {
  return createHash('sha256').update(data).digest()
}

function mustPayTo (tx, address, amount) {
  // TODO: this should be in its own lib for smart contract conditions

  // TODO: allow multiple inputs (will require keeping track of how much
  //       output was already counted by other contract inputs, otherwise
  //       an attacker can take some of the contracts' payments)
  if (tx.inputs.length > 1) {
    throw Error('Must have exactly 1 input')
  }

  // TODO: support arbitrary output types
  for (let output of tx.outputs) {
    if (output.type !== 'accounts') continue
    if (output.address !== address) continue
    if (output.amount !== amount) continue
    return
  }
  throw Error(`Must have output which pays to address "${address}"`)
}
