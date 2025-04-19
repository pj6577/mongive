import { NextResponse } from 'next/server'

// 임시 데이터 (실제로는 데이터베이스에서 가져와야 함)
const TEMP_LEADERBOARD = [
  { address: '0x123...abc', score: 0.5 },
  { address: '0x456...def', score: 0.3 },
  { address: '0x789...ghi', score: 0.2 }
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const networkId = searchParams.get('networkId')

    if (!networkId) {
      return NextResponse.json(
        { error: '네트워크 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 실제로는 데이터베이스에서 해당 네트워크의 리더보드 데이터를 가져와야 함
    return NextResponse.json(TEMP_LEADERBOARD)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: '리더보드를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 