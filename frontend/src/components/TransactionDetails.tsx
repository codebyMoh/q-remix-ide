import React from 'react';
import { DeploymentResult } from '@/utils/deployContract';

interface TransactionDetailsProps {
  transaction: DeploymentResult;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ transaction }) => {
  if (!transaction || !transaction.success) {
    return null;
  }
  
  // Format timestamp to readable date if available
  const formattedDate = transaction.timestamp 
    ? new Date(transaction.timestamp * 1000).toLocaleString() 
    : 'N/A';
  
  return (
    <div className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-md overflow-auto">
      <h3 className="text-white font-bold mb-2">Transaction Details</h3>
      
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <span>Status:</span>
        <span className={transaction.status === 1 ? "text-green-500" : "text-red-500"}>
          {transaction.status === 1 ? "Success" : "Failed"}
        </span>
        
        <span>Contract Address:</span>
        <span className="text-blue-400 break-all">{transaction.contractAddress}</span>
        
        <span>Transaction Hash:</span>
        <span className="text-blue-400 break-all">{transaction.transactionHash}</span>
        
        <span>Block Hash:</span>
        <span className="break-all">{transaction.blockHash}</span>
        
        <span>Block Number:</span>
        <span>{transaction.blockNumber}</span>
        
        <span>Timestamp:</span>
        <span>{formattedDate}</span>
        
        <span>From:</span>
        <span className="break-all">{transaction.from}</span>
        
        <span>To:</span>
        <span className="break-all">{transaction.to || 'Contract Creation'}</span>
        
        <span>Gas Used:</span>
        <span>{transaction.gasUsed}</span>
        
        <span>Transaction Cost:</span>
        <span>{transaction.transactionCost}</span>
        
        <span>Execution Cost:</span>
        <span>{transaction.executionCost}</span>
        
        <span>Confirmations:</span>
        <span>{transaction.confirmations}</span>
      </div>
      
      <div className="mt-4">
        <h4 className="text-white font-bold mb-1">Input Data:</h4>
        <div className="bg-gray-800 p-2 rounded overflow-x-auto">
          <code className="break-all">{transaction.input}</code>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails; 