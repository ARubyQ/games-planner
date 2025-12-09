import React, { useState } from 'react'
import './NicknameInput.css'

function NicknameInput({ onSubmit }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedNickname = nickname.trim()
    
    if (!trimmedNickname) {
      setError('Пожалуйста, введите ваш ник')
      return
    }

    if (trimmedNickname.length < 2) {
      setError('Ник должен содержать минимум 2 символа')
      return
    }

    if (trimmedNickname.length > 20) {
      setError('Ник не должен превышать 20 символов')
      return
    }

    setError('')
    onSubmit(trimmedNickname)
  }

  return (
    <div className="nickname-container">
      <div className="nickname-card">
        <h2>Добро пожаловать!</h2>
        <p>Введите ваш ник для входа в планировщик</p>
        <form onSubmit={handleSubmit} className="nickname-form">
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setError('')
            }}
            placeholder="Ваш ник"
            className="nickname-input"
            maxLength={20}
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="submit-btn">
            Войти
          </button>
        </form>
      </div>
    </div>
  )
}

export default NicknameInput

