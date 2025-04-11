import { NextResponse } from 'next/server'
import { parseEther } from 'viem'

// 실제 수신 주소로 변경 필요
const DONATION_ADDRESS = '0x8Cce96679B7Ac1a58de0156861AAeb7eaA1Cf33e'

export async function POST(request: Request) {
  try {
    const { amount } = await request.json()

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: '유효한 금액을 입력해주세요' },
        { status: 400 }
      )
    }

    // 트랜잭션 데이터 생성
    const transaction = {
      to: DONATION_ADDRESS,
      value: parseEther(amount.toString()).toString(),
      chainId: 10143, // Monad 테스트넷 체인 ID
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('기부 처리 중 오류 발생:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 