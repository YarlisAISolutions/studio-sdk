import { describe, expect, it } from 'vitest'
import DefaultClient, {
  MyBotBoxClient,
  type MyBotBoxConfig,
  MyBotBoxError,
  YStudioClient,
  type YStudioConfig,
  YStudioError,
} from './index'

describe('deprecated YStudio aliases (MBB-682)', () => {
  it('are the same objects as the MyBotBox names', () => {
    expect(YStudioClient).toBe(MyBotBoxClient)
    expect(YStudioError).toBe(MyBotBoxError)
    expect(DefaultClient).toBe(MyBotBoxClient)
  })

  it('keep instanceof and catch working across old and new names', () => {
    const config: YStudioConfig = { apiKey: 'k', baseUrl: 'https://x.test' }
    const sameConfig: MyBotBoxConfig = config
    expect(new YStudioClient(sameConfig)).toBeInstanceOf(MyBotBoxClient)
    expect(new MyBotBoxError('boom')).toBeInstanceOf(YStudioError)
  })
})
