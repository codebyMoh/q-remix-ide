"use client";
import React from "react";

const DeployRun = () => {
  return (
    <div className="p-4 space-y-4">
      {/* 1. Environment Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Environment</h2>
        <p className="text-sm text-gray-600">Injected Provider</p>
      </div>

      {/* 2. Account Info Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Account</h2>
        <p className="text-sm text-gray-600">
          Address: 0x0000000000000000000000000000000000000000
        </p>
        <p className="text-sm text-gray-600">Balance: 0.00 ETH</p>
      </div>

      {/* 3. Compiled Contracts Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Compiled Contracts</h2>
        <p className="text-sm text-gray-600">No contracts compiled yet.</p>
      </div>

      {/* 4. Deployed Contracts Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Deployed Contracts</h2>
        <p className="text-sm text-gray-600">No deployed contracts.</p>
      </div>
    </div>
  );
};

export default DeployRun;
