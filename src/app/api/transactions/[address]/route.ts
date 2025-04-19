import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { monadTestnet, mainnet, sepolia } from 'wagmi/chains'

// API 설정
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const SOCIALSCAN_API_KEY = process.env.SOCIALSCAN_API_KEY

interface ApiConfig {
  url: string
  key: string | undefined
}

const API_CONFIGS: Record<number, ApiConfig> = {
  [monadTestnet.id]: {
    url: 'https://api.socialscan.io/monad-testnet/v1/developer/api',
    key: SOCIALSCAN_API_KEY
  },
  [mainnet.id]: {
    url: 'https://api.etherscan.io/api',
    key: ETHERSCAN_API_KEY
  },
  [sepolia.id]: {
    url: 'https://api-sepolia.etherscan.io/api',
    key: ETHERSCAN_API_KEY
  }
}

const client = createPublicClient({
  chain: monadTestnet,
  transport: http()
})

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params
    const { searchParams } = new URL(request.url)
    
    // 네트워크 ID 가져오기
    const networkId = searchParams.get('networkId') || monadTestnet.id.toString()
    const apiConfig = API_CONFIGS[Number(networkId)]

    if (!apiConfig) {
      return NextResponse.json(
        { error: '지원하지 않는 네트워크입니다' },
        { status: 400 }
      )
    }

    // 쿼리 파라미터 가져오기
    const page = searchParams.get('page') || '1'
    const offset = searchParams.get('offset') || '10'
    const startblock = searchParams.get('startblock') || '0'
    const endblock = searchParams.get('endblock') || '99999999'
    const sort = searchParams.get('sort') || 'desc'
    const contractaddress = searchParams.get('contractaddress')

    if (!address) {
      return NextResponse.json(
        { error: '지갑 주소가 필요합니다' },
        { status: 400 }
      )
    }

    // API 엔드포인트 구성
    const isSocialScan = networkId === monadTestnet.id.toString()
    const action = contractaddress ? 'tokentx' : 'txlist'
    const apiUrl = `${apiConfig.url}?module=account&action=${action}&address=${address}${
      contractaddress ? `&contractaddress=${contractaddress}` : ''
    }&page=${page}&offset=${offset}&startblock=${startblock}&endblock=${endblock}&sort=${sort}&apikey=${apiConfig.key}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error('API 요청 실패')
    }

    const data = await response.json()
    
    if (data.status !== '1') {
      throw new Error(data.message || '트랜잭션 기록을 가져오는데 실패했습니다')
    }

    // 트랜잭션 데이터 가공
    const transactions = data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timestamp: Number(tx.timeStamp),
      status: tx.isError === '0' ? 'success' : 'failed',
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      confirmations: tx.confirmations,
      ...(contractaddress && {
        tokenSymbol: tx.tokenSymbol,
        tokenName: tx.tokenName,
        tokenDecimal: tx.tokenDecimal
      })
    }))

    return NextResponse.json({
      transactions,
      page: Number(page),
      offset: Number(offset),
      total: data.result.length,
      hasMore: data.result.length === Number(offset)
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: '트랜잭션 기록을 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 