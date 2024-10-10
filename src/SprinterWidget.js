import React, { useState, useEffect } from 'react';
import { Sprinter } from '@chainsafe/sprinter-sdk';

const SprinterWidget = () => {
  const [account, setAccount] = useState('');
  const [balances, setBalances] = useState({
    USDT: {},
    USDC: {}
  });
  const [selectedAmount, setSelectedAmount] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDT');
  const [quote, setQuote] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');

  const sprinter = new Sprinter();

  const supportedChains = [
    { id: 43114, name: 'Avalanche' },
    { id: 1, name: 'Mainnet' },
    { id: 10, name: 'Optimism' },
    { id: 137, name: 'Polygon' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum' },
    { id: 100, name: 'Gnosis' },
  ];

  useEffect(() => {
    setAccount('0x1234...5678');
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const usdcBalances = await sprinter.getUserBalances(account, ['USDC']);
      const usdtBalances = await sprinter.getUserBalances(account, ['USDT']);
      
      const newBalances = {
        USDC: {},
        USDT: {}
      };

      supportedChains.forEach(chain => {
        newBalances.USDC[chain.id] = usdcBalances.USDC.find(b => b.chainId === chain.id)?.balance || '0';
        newBalances.USDT[chain.id] = usdtBalances.USDT.find(b => b.chainId === chain.id)?.balance || '0';
      });

      setBalances(newBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const handlePayClick = async () => {
    try {
      const solution = await sprinter.getSolution({
        account,
        token: selectedToken,
        destinationChain: parseInt(selectedDestination),
        amount: selectedAmount
      });
      setQuote(solution[0]);
    } catch (error) {
      console.error('Error getting quote:', error);
    }
  };

  const handleAggregateClick = async () => {
    try {
      console.log('Executing transaction with quote:', quote);
      setQuote(null);
      setSelectedAmount('');
      setSelectedDestination('');
      setDestinationAddress('');
    } catch (error) {
      console.error('Error executing transaction:', error);
    }
  };

  const renderBalanceTable = () => (
    <table style={{width: '100%', borderCollapse: 'collapse'}}>
      <thead>
        <tr>
          <th style={{border: '1px solid black', padding: '8px'}}>Network</th>
          <th style={{border: '1px solid black', padding: '8px'}}>USDT</th>
          <th style={{border: '1px solid black', padding: '8px'}}>USDC</th>
        </tr>
      </thead>
      <tbody>
        {supportedChains.map((chain) => (
          <tr key={chain.id}>
            <td style={{border: '1px solid black', padding: '8px'}}>{chain.name}</td>
            <td style={{border: '1px solid black', padding: '8px'}}>{balances.USDT[chain.id]}</td>
            <td style={{border: '1px solid black', padding: '8px'}}>{balances.USDC[chain.id]}</td>
          </tr>
        ))}
        <tr>
          <td style={{border: '1px solid black', padding: '8px'}}><strong>TOTAL</strong></td>
          <td style={{border: '1px solid black', padding: '8px'}}><strong>{Object.values(balances.USDT).reduce((a, b) => a + Number(b), 0)}</strong></td>
          <td style={{border: '1px solid black', padding: '8px'}}><strong>{Object.values(balances.USDC).reduce((a, b) => a + Number(b), 0)}</strong></td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div style={{border: '1px solid black', padding: '20px', borderRadius: '5px'}}>
      <h2>Sprinter Balance Aggregator</h2>
      {renderBalanceTable()}
      <div style={{marginTop: '20px'}}>
        <input
          type="number"
          value={selectedAmount}
          onChange={(e) => setSelectedAmount(e.target.value)}
          placeholder="Amount"
          style={{width: '100%', marginBottom: '10px', padding: '5px'}}
        />
        <select
          value={selectedDestination}
          onChange={(e) => setSelectedDestination(e.target.value)}
          style={{width: '100%', marginBottom: '10px', padding: '5px'}}
        >
          <option value="">Select destination chain</option>
          {supportedChains.map((chain) => (
            <option key={chain.id} value={chain.id}>{chain.name}</option>
          ))}
        </select>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          style={{width: '100%', marginBottom: '10px', padding: '5px'}}
        >
          <option value="USDT">USDT</option>
          <option value="USDC">USDC</option>
        </select>
        <button onClick={handlePayClick} style={{width: '100%', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer'}}>
          Quote Aggregate
        </button>
      </div>
      {quote && (
        <div style={{marginTop: '20px'}}>
          <h3>Quote</h3>
          <p>Total: {quote.amount} {selectedToken}</p>
          <p>Destination: {supportedChains.find(c => c.id === quote.destinationChain)?.name}</p>
          <p>Fee: {quote.fee.amount}</p>
          <p>Gas Cost: {quote.gasCost.amount}</p>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="Destination Address"
            style={{width: '100%', marginBottom: '10px', padding: '5px'}}
          />
          <button onClick={handleAggregateClick} style={{width: '100%', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer'}}>
            Pay/Aggregate
          </button>
        </div>
      )}
    </div>
  );
};

export default SprinterWidget;