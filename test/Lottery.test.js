const assert = require('assert');
const { execFile } = require('child_process');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const { abi, evm } = require('../compile');

let accounts;
let lottery;

beforeEach(async () => {
  // Get a list of all accounts
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [],
    })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery', () => {
  it('deploys a contract', () => {
    assert.ok(lottery.options.address);
  });

  it('allow one account into lottery',  async() => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02','ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    })

    assert.equal(accounts[0],players[0])
    assert.equal(1,players.length)
  });

  it('allow multiple account into lottery',  async() => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02','ether')
    });

    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02','ether')
    });
    
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02','ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    })

    assert.equal(accounts[0],players[0])
    assert.equal(accounts[1],players[1])
    assert.equal(accounts[2],players[2])
    assert.equal(3,players.length)
  })

  it('require a minimum amount of ether',  async() => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei('0.001','ether')
      });
      assert(false)
    } catch(err) {
      assert.ok(err)
    }

  })

  it('only manager can call pick winnner',  async() => {
      await lottery.methods.enter().send({
        from: accounts[1],
        value: web3.utils.toWei('0.02','ether')
      });

      try {
        await lottery.methods.pickWinner().send({
          from: accounts[1]
        });
        executed = 'success';
      } catch (err) {
        executed = 'fail'
      }

      assert.equal('fail',executed);


  })

  it('send money to the winner and reset the array',  async() => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2','ether')
    });

    const initalBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({from: accounts[0]});
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initalBalance
    const players = await lottery.methods.getPlayers().call()

    assert(difference > web3.utils.toWei('1.8','ether'));
    assert(players.length == 0)
  });

});