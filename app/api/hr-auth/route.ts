import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password } = body

    const correctPassword = process.env.HR_PASSWORD || '1234'

    if (password === correctPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error authenticating:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
