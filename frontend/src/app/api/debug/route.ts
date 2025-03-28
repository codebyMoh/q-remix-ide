import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    const useGeneratedSources = searchParams.get('useGeneratedSources') === 'true';

    if (!hash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Connect to local Hardhat node
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');

    // Get transaction receipt first
    const receipt = await provider.getTransactionReceipt(hash);
    if (!receipt) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get transaction trace
    const trace = await provider.send('debug_traceTransaction', [
      hash,
      {
        disableStorage: false,
        disableMemory: false,
        enableReturnData: true,
        tracer: 'structTracer',
        useGeneratedSources
      }
    ]);

    // Transform the trace into a standardized format
    const transformedTrace = {
      failed: false,
      gas: receipt.gasUsed.toString(),
      returnValue: trace.returnValue || null,
      structLogs: trace.structLogs?.map((log: any) => ({
        pc: log.pc,
        op: log.op,
        gas: log.gas,
        gasCost: log.gasCost,
        depth: log.depth,
        stack: log.stack || [],
        memory: log.memory || [],
        storage: log.storage || {},
        error: log.error || null
      })) || []
    };

    // Validate the transformed trace
    if (!transformedTrace.structLogs || transformedTrace.structLogs.length === 0) {
      throw new Error('No valid trace steps found');
    }

    return NextResponse.json(transformedTrace);
  } catch (error: any) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 