'use client'

import { useState } from 'react'
import CryptoJS from 'crypto-js'

export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [validWebhook, setValidWebhook] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const AES_KEY = CryptoJS.enc.Hex.parse('5869b35fb38774f665eb96e76f4d1683')
  const AES_IV = CryptoJS.enc.Hex.parse('713f379769ebc8a341f3e52de2791721')

  const pkcs7Pad = (data: any, blockSize: number) => {
    const paddingLength = blockSize - (data.sigBytes % blockSize)
    const words = data.words.slice()
    
    for (let i = 0; i < paddingLength; i++) {
      const bytePos = data.sigBytes + i
      const wordIndex = bytePos >>> 2
      const shift = (3 - (bytePos % 4)) * 8
      
      if (!words[wordIndex]) {
        words[wordIndex] = 0
      }
      words[wordIndex] |= (paddingLength << shift)
    }
    
    return CryptoJS.lib.WordArray.create(words, data.sigBytes + paddingLength)
  }

  const validateWebhook = async (webhookUrl: string) => {
    setIsValidating(true)
    try {
      const response = await fetch(webhookUrl)
      if (response.ok) {
        setValidWebhook(webhookUrl)
        return true
      } else {
        setValidWebhook(null)
        return false
      }
    } catch (error) {
      setValidWebhook(null)
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const deleteWebhook = async () => {
    if (!validWebhook) return
    
    const confirmed = confirm('Biztosan törölni szeretnéd ezt a webhook-ot? Ez a művelet nem vonható vissza!')
    if (!confirmed) return

    try {
      const response = await fetch(validWebhook, {
        method: 'DELETE'
      })

      if (response.ok || response.status === 204) {
        alert('✅ Webhook sikeresen törölve!')
        setValidWebhook(null)
        clearAll()
      } else {
        alert('❌ Nem sikerült törölni a webhook-ot!')
      }
    } catch (error) {
      alert('❌ Hiba történt a webhook törlése során!')
    }
  }

  const decryptWebhook = async () => {
    if (!input.trim()) {
      setOutput('⚠️  Kérlek, adj meg egy titkosított webhook-ot!')
      setStatus('error')
      return
    }

    try {
      const cipherText = CryptoJS.enc.Base64.parse(input)
      const plainAes = CryptoJS.lib.WordArray.create(cipherText.words, cipherText.sigBytes)
      const paddedData = pkcs7Pad(plainAes, 32)
      
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: paddedData } as any,
        AES_KEY,
        {
          iv: AES_IV,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.NoPadding
        }
      )

      let decryptedStr = decrypted.toString(CryptoJS.enc.Latin1)
      
      if (!decryptedStr) {
        throw new Error('Dekódolás sikertelen')
      }
      
      const firstPart = decryptedStr.split('\x00')[0]
      
      if (!firstPart || firstPart.length < 10) {
        throw new Error('Túl rövid adat')
      }
      
      const normalCharsCount = (firstPart.match(/[a-zA-Z0-9]/g) || []).length
      if (normalCharsCount < 10) {
        throw new Error('Érvénytelen karakterek')
      }
      
      if (firstPart.includes('com/api/webhooks/')) {
        const parts = firstPart.split('com/api/webhooks/')
        if (parts.length > 1 && parts[1]) {
          const webhookId = parts[1]
          const webhookUrl = `https://discord.com/api/webhooks/${webhookId}`
          setOutput(`✅  ${webhookUrl}`)
          setStatus('success')
          await validateWebhook(webhookUrl)
          return
        }
      }
      
      const webhookUrl = `https://discord.com/api/webhooks/${firstPart}`
      setOutput(`✅  ${webhookUrl}`)
      setStatus('success')
      await validateWebhook(webhookUrl)
    } catch (error) {
      setOutput('❌  Hibás titkosított webhook! Ellenőrizd a bemenetet.')
      setStatus('error')
    }
  }

  const copyToClipboard = () => {
    if (output && !output.startsWith('❌') && !output.startsWith('⚠️')) {
      const cleanOutput = output.replace('✅  ', '')
      navigator.clipboard.writeText(cleanOutput)
      alert('A webhook kimásolva a vágólapra!')
    } else {
      alert('Nincs mit másolni!')
    }
  }

  const clearAll = () => {
    setInput('')
    setValidWebhook(null)
    setOutput('')
    setStatus('idle')
  }

  const getOutputColor = () => {
    switch (status) {
      case 'success':
        return 'text-secondary'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-darker rounded-t-2xl p-8 border-b-2 border-primary/20">
          <div className="flex items-center justify-center gap-4">
            <span className="text-6xl">🔓</span>
            <h1 className="text-4xl font-bold text-white">
              Itroublve Decryptor
            </h1>
          </div>
        </div>

        <div className="bg-darker/80 backdrop-blur-sm p-8 rounded-b-2xl shadow-2xl">
          <div className="bg-dark/50 rounded-xl p-4 mb-8 border border-primary/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">ℹ️</span>
              <p className="text-gray-300">
                Illeszd be a titkosított Discord webhook-ot a dekódoláshoz
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-200">
              Titkosított Webhook:
            </label>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Illeszd be ide a titkosított webhook-ot..."
                className="w-full h-32 bg-dark border-2 border-primary/30 rounded-xl p-4 text-gray-200 
                         placeholder-gray-500 focus:outline-none focus:border-primary transition-all
                         resize-none font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    decryptWebhook()
                  }
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <button
              onClick={decryptWebhook}
              className="bg-primary hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-xl
                       transition-all transform hover:scale-105 active:scale-95 shadow-lg
                       hover:shadow-primary/50 flex items-center gap-2 text-lg"
            >
              <span>🔓</span>
              Dekódolás
            </button>

            <button
              onClick={copyToClipboard}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl
                       transition-all transform hover:scale-105 active:scale-95 shadow-lg
                       hover:shadow-blue-600/50 flex items-center gap-2 text-lg"
            >
              <span>📋</span>
              Másolás
            </button>
{validWebhook && (
              <button
                onClick={deleteWebhook}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl
                         transition-all transform hover:scale-105 active:scale-95 shadow-lg
                         hover:shadow-red-600/50 flex items-center gap-2 text-lg"
              >
                <span>🗑️</span>
                Webhook Törlése
              </button>
            )}

            <button
              onClick={clearAll}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl
                       transition-all transform hover:scale-105 active:scale-95 shadow-lg
                       hover:shadow-gray-600/50 flex items-center gap-2 text-lg"
            >
              <span>🗑️</span>
              Törlés
            </button>
          </div>

          <div>
            {isValidating && (
                <div className="mt-2 text-yellow-500 text-sm flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Webhook érvényesítése...
                </div>
              )}
              {validWebhook && !isValidating && (
                <div className="mt-2 text-green-500 text-sm flex items-center gap-2">
                  <span>✅</span>
                  Érvényes webhook - törlés elérhető
                </div>
              )}
              {status === 'success' && !validWebhook && !isValidating && (
                <div className="mt-2 text-red-500 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  A webhook nem létezik vagy már törölve lett
                </div>
              )}
            </div>

            <div>
              <label className="block text-lg font-semibold mb-3 text-gray-200">
                Eredmény:
              </label>
              <div className="relative">
                <div
                  className={`w-full min-h-[150px] bg-dark border-2 rounded-xl p-4 font-mono text-sm
                            ${status === 'success' ? 'border-secondary/50' : 'border-gray-700'}
                            whitespace-pre-wrap break-all ${getOutputColor()}`}
                >
                  {output || 'Az eredmény itt fog megjelenni...'}
                </div>
              </div>
            </div>
        </div>

        <div className="text-center mt-6 text-gray-500">
          <p>
            <a 
              href="https://t.me/dominikzxp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              @dominik
            </a>
            {" • 2025"}
          </p>
        </div>
      </div>
    </main>
  )
}
