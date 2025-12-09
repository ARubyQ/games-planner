import React, { useState, useEffect, useCallback, useRef } from 'react'
import './CalendarGrid.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function CalendarGrid({ nickname, calendarId = 'default' }) {
  const [selectedSlots, setSelectedSlots] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFilterNicknames, setSelectedFilterNicknames] = useState([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragAction, setDragAction] = useState(null)
  const [processedSlots, setProcessedSlots] = useState(new Set())
  const [dragStartSlot, setDragStartSlot] = useState(null)
  const hasMovedRef = useRef(false)
  const touchStartRef = useRef(null)
  const isScrollingRef = useRef(false)
  const pendingSlotsRef = useRef(new Map())
  const syncIntervalRef = useRef(null)
  const isDraggingRef = useRef(false)
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const calendarWrapperRef = useRef(null)
  const getUserTimezone = () => {
    const saved = localStorage.getItem(`timezone_${calendarId}`)
    if (saved) {
      return parseInt(saved)
    }
    const userOffset = -new Date().getTimezoneOffset() / 60
    return Math.max(-4, Math.min(4, Math.round(userOffset)))
  }
  
  const [timezone, setTimezone] = useState(() => getUserTimezone())

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch(`${API_URL}/timezone/${calendarId}`)
        const data = await response.json()
        if (data.timezone !== undefined && data.timezone !== null) {
          setTimezone(data.timezone)
        } else {
          const userOffset = -new Date().getTimezoneOffset() / 60
          const clampedOffset = Math.max(-4, Math.min(4, Math.round(userOffset)))
          setTimezone(clampedOffset)
        }
      } catch (error) {
        console.error('Ошибка загрузки часового пояса:', error)
        const userOffset = -new Date().getTimezoneOffset() / 60
        const clampedOffset = Math.max(-4, Math.min(4, Math.round(userOffset)))
        setTimezone(clampedOffset)
      }
    }

    fetchTimezone()
    
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`timezone_${calendarId}`)
      if (saved) {
        const newTimezone = parseInt(saved)
        setTimezone(newTimezone)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(() => {
      const saved = localStorage.getItem(`timezone_${calendarId}`)
      if (saved) {
        const savedTimezone = parseInt(saved)
        setTimezone(prevTimezone => {
          if (savedTimezone !== prevTimezone) {
            return savedTimezone
          }
          return prevTimezone
        })
      }
    }, 100)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [calendarId])

  const convertToUTC = useCallback((dateKey, timeSlot, tz) => {
    const [year, month, day] = dateKey.split('-').map(Number)
    const [hour, minute] = timeSlot.split(':').map(Number)
    
    const dateInTimezone = new Date(Date.UTC(year, month - 1, day, hour, minute))
    const utcDate = new Date(dateInTimezone.getTime() - tz * 60 * 60 * 1000)
    
    const utcYear = utcDate.getUTCFullYear()
    const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
    const utcDay = String(utcDate.getUTCDate()).padStart(2, '0')
    const utcHour = String(utcDate.getUTCHours()).padStart(2, '0')
    const utcMinute = String(utcDate.getUTCMinutes()).padStart(2, '0')
    
    return {
      dateKey: `${utcYear}-${utcMonth}-${utcDay}`,
      timeSlot: `${utcHour}:${utcMinute}`
    }
  }, [])

  const convertFromUTC = useCallback((utcDateKey, utcTimeSlot, tz) => {
    const [year, month, day] = utcDateKey.split('-').map(Number)
    const [hour, minute] = utcTimeSlot.split(':').map(Number)
    
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
    const dateInTimezone = new Date(utcDate.getTime() + tz * 60 * 60 * 1000)
    
    const tzYear = dateInTimezone.getUTCFullYear()
    const tzMonth = String(dateInTimezone.getUTCMonth() + 1).padStart(2, '0')
    const tzDay = String(dateInTimezone.getUTCDate()).padStart(2, '0')
    const tzHour = String(dateInTimezone.getUTCHours()).padStart(2, '0')
    const tzMinute = String(dateInTimezone.getUTCMinutes()).padStart(2, '0')
    
    return {
      dateKey: `${tzYear}-${tzMonth}-${tzDay}`,
      timeSlot: `${tzHour}:${tzMinute}`
    }
  }, [])

  const timeSlots = []
  for (let hour = 8; hour <= 23; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
  }

  const dates = []
  const today = new Date()
  for (let i = 0; i < 21; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }

  const formatDate = (date) => {
    const day = date.getDate()
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    const month = monthNames[date.getMonth()]
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const weekday = weekdays[date.getDay()]
    const isToday = date.toDateString() === today.toDateString()
    
    const year = date.getFullYear()
    const monthNum = date.getMonth() + 1
    const dayNum = date.getDate()
    const fullDate = `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
    
    return {
      day,
      month,
      weekday,
      isToday,
      fullDate
    }
  }

  const formatSlotTooltip = (dateKey, timeSlot) => {
    const [year, month, day] = dateKey.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
    const weekday = weekdays[date.getDay()]
    const monthName = monthNames[date.getMonth()]
    
    return `${day} ${monthName} ${year}, ${weekday}, ${timeSlot}`
  }

  useEffect(() => {
    if (timezone === null || timezone === undefined) return

    const fetchSlots = async () => {
      if (isDraggingRef.current) {
        return
      }

      try {
        const response = await fetch(`${API_URL}/slots/${calendarId}/all`)
        const data = await response.json()
        
        const convertedSlots = {}
        Object.keys(data || {}).forEach(utcSlotKey => {
          const [utcDateKey, utcTimeSlot] = utcSlotKey.split('_')
          const converted = convertFromUTC(utcDateKey, utcTimeSlot, timezone)
          const convertedSlotKey = `${converted.dateKey}_${converted.timeSlot}`
          convertedSlots[convertedSlotKey] = data[utcSlotKey]
        })
        
        setSelectedSlots(convertedSlots)
        setIsLoading(false)
      } catch (error) {
        console.error('Ошибка загрузки слотов:', error)
        setIsLoading(false)
      }
    }

    fetchSlots()
    syncIntervalRef.current = setInterval(fetchSlots, 2000)
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [calendarId, timezone, convertFromUTC])

  useEffect(() => {
    const updateCalendarHeight = () => {
      if (calendarWrapperRef.current && window.innerWidth <= 768) {
        const appHeader = document.querySelector('.app-header')
        const appMain = document.querySelector('.app-main')
        const calendarContainer = document.querySelector('.calendar-container')
        const filterContainer = document.querySelector('.filter-container')
        const calendarInfo = document.querySelector('.calendar-info')
        
        if (appHeader && appMain && calendarContainer) {
          const headerHeight = appHeader.offsetHeight
          const mainPadding = parseInt(window.getComputedStyle(appMain).paddingTop) + parseInt(window.getComputedStyle(appMain).paddingBottom)
          const containerPadding = parseInt(window.getComputedStyle(calendarContainer).paddingTop) + parseInt(window.getComputedStyle(calendarContainer).paddingBottom)
          const filterHeight = filterContainer ? filterContainer.offsetHeight + parseInt(window.getComputedStyle(filterContainer).marginBottom) : 0
          const infoHeight = calendarInfo ? calendarInfo.offsetHeight + parseInt(window.getComputedStyle(calendarInfo).marginBottom) : 0
          
          const availableHeight = window.innerHeight - headerHeight - mainPadding - containerPadding - filterHeight - infoHeight - 20
          calendarWrapperRef.current.style.height = `${Math.max(300, availableHeight)}px`
        }
      }
    }
    
    updateCalendarHeight()
    window.addEventListener('resize', updateCalendarHeight)
    window.addEventListener('orientationchange', updateCalendarHeight)
    
    const interval = setInterval(updateCalendarHeight, 100)
    
    return () => {
      window.removeEventListener('resize', updateCalendarHeight)
      window.removeEventListener('orientationchange', updateCalendarHeight)
      clearInterval(interval)
    }
  }, [selectedFilterNicknames, isFilterOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFilterOpen && !event.target.closest('.filter-container')) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isFilterOpen])

  const applySlotAction = async (dateKey, timeSlot, action, isDrag = false) => {
    const utcSlot = convertToUTC(dateKey, timeSlot, timezone)
    const utcSlotKey = `${utcSlot.dateKey}_${utcSlot.timeSlot}`
    const localSlotKey = `${dateKey}_${timeSlot}`
    
    if (isDrag && processedSlots.has(localSlotKey)) {
      return
    }
    
    if (isDrag) {
      setProcessedSlots(prev => new Set([...prev, localSlotKey]))
    }

    setSelectedSlots(prev => {
      const newSlots = { ...prev }
      if (!newSlots[localSlotKey]) {
        newSlots[localSlotKey] = []
      }
      
      if (action === 'add') {
        if (!newSlots[localSlotKey].includes(nickname)) {
          newSlots[localSlotKey] = [...newSlots[localSlotKey], nickname]
        }
      } else {
        newSlots[localSlotKey] = newSlots[localSlotKey].filter(n => n !== nickname)
        if (newSlots[localSlotKey].length === 0) {
          delete newSlots[localSlotKey]
        }
      }
      return newSlots
    })

    if (isDrag) {
      pendingSlotsRef.current.set(utcSlotKey, { slotKey: utcSlotKey, nickname, action })
    } else {
      try {
        const response = await fetch(`${API_URL}/slots/${calendarId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slotKey: utcSlotKey, nickname, action }),
        })
        
        const result = await response.json()
        if (result.success) {
          const convertedSlots = {}
          Object.keys(result.slots || {}).forEach(utcKey => {
            const [utcDateKey, utcTimeSlot] = utcKey.split('_')
            const converted = convertFromUTC(utcDateKey, utcTimeSlot, timezone)
            const convertedKey = `${converted.dateKey}_${converted.timeSlot}`
            convertedSlots[convertedKey] = result.slots[utcKey]
          })
          setSelectedSlots(convertedSlots)
        }
      } catch (error) {
        console.error('Ошибка сохранения слота:', error)
        fetch(`${API_URL}/slots/${calendarId}/all`)
          .then(res => res.json())
          .then(data => {
            const convertedSlots = {}
            Object.keys(data || {}).forEach(utcKey => {
              const [utcDateKey, utcTimeSlot] = utcKey.split('_')
              const converted = convertFromUTC(utcDateKey, utcTimeSlot, timezone)
              const convertedKey = `${converted.dateKey}_${converted.timeSlot}`
              convertedSlots[convertedKey] = data[utcKey]
            })
            setSelectedSlots(convertedSlots)
          })
          .catch(err => console.error('Ошибка синхронизации:', err))
      }
    }
  }

  const handleTouchMove = useCallback((event) => {
    if (!touchStartRef.current) return
    
    const touch = event.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    
    const calendarWrapper = document.querySelector('.calendar-wrapper')
    if (calendarWrapper) {
      const currentScrollTop = calendarWrapper.scrollTop
      const currentScrollLeft = calendarWrapper.scrollLeft
      const scrollDeltaY = Math.abs(currentScrollTop - touchStartRef.current.scrollTop)
      const scrollDeltaX = Math.abs(currentScrollLeft - touchStartRef.current.scrollLeft)
      
      if (scrollDeltaY > 3 || scrollDeltaX > 3) {
        isScrollingRef.current = true
        return
      }
    }
    
    if (deltaY > 10 && deltaY > deltaX * 1.5) {
      isScrollingRef.current = true
      return
    }
    
    if (isScrollingRef.current) return
    
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    if (element && element.closest('.time-slot')) {
      const slotElement = element.closest('.time-slot')
      const dateKey = slotElement.getAttribute('data-date-key')
      const timeSlot = slotElement.getAttribute('data-time-slot')
      
      if (dateKey && timeSlot) {
        touchStartRef.current.lastSlot = { dateKey, timeSlot }
        
        if (!isDragging && deltaX + deltaY > 15) {
          hasMovedRef.current = true
        }
      }
    }
  }, [isDragging])

  useEffect(() => {
    const handleEnd = async (event) => {
      if (isScrollingRef.current && !isDragging) {
        touchStartRef.current = null
        isScrollingRef.current = false
        return
      }
      
      if (touchStartRef.current && !isDragging) {
        if (isScrollingRef.current) {
          touchStartRef.current = null
          isScrollingRef.current = false
          return
        }
        
        const { dateKey, timeSlot, x, y, time, lastSlot } = touchStartRef.current
        
        let finalDelta = 0
        if (event && event.changedTouches && event.changedTouches.length > 0) {
          const finalTouch = event.changedTouches[0]
          const finalDeltaX = Math.abs(finalTouch.clientX - x)
          const finalDeltaY = Math.abs(finalTouch.clientY - y)
          finalDelta = Math.sqrt(finalDeltaX * finalDeltaX + finalDeltaY * finalDeltaY)
        }
        
        const targetSlot = (lastSlot && hasMovedRef.current) ? lastSlot : { dateKey, timeSlot }
        const { dateKey: targetDateKey, timeSlot: targetTimeSlot } = targetSlot
        
        const timeDelta = Date.now() - time
        const isSingleClick = timeDelta < 300 && finalDelta < 15
        
        if (isSingleClick || (hasMovedRef.current && !isScrollingRef.current)) {
          const localSlotKey = `${targetDateKey}_${targetTimeSlot}`
          const currentNicknames = selectedSlots[localSlotKey] || []
          const isMySlotSelected = currentNicknames.includes(nickname)
          const action = isMySlotSelected ? 'remove' : 'add'
          
          applySlotAction(targetDateKey, targetTimeSlot, action, false)
        }
        
        touchStartRef.current = null
        isScrollingRef.current = false
        hasMovedRef.current = false
        return
      }
      
      if (isDragging) {
        const pendingSlots = Array.from(pendingSlotsRef.current.values())
        
        if (pendingSlots.length > 0) {
          const sendSlots = async () => {
            for (const slot of pendingSlots) {
              try {
                await fetch(`${API_URL}/slots/${calendarId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(slot),
                })
              } catch (error) {
                console.error('Ошибка сохранения слота:', error)
              }
            }
            
            try {
              const response = await fetch(`${API_URL}/slots/${calendarId}/all`)
              const data = await response.json()
              
              const convertedSlots = {}
              Object.keys(data || {}).forEach(utcSlotKey => {
                const [utcDateKey, utcTimeSlot] = utcSlotKey.split('_')
                const converted = convertFromUTC(utcDateKey, utcTimeSlot, timezone)
                const convertedSlotKey = `${converted.dateKey}_${converted.timeSlot}`
                convertedSlots[convertedSlotKey] = data[utcSlotKey]
              })
              
              setSelectedSlots(convertedSlots)
            } catch (error) {
              console.error('Ошибка синхронизации после drag:', error)
            }
          }
          
          sendSlots()
        } else {
          try {
            const response = await fetch(`${API_URL}/slots/${calendarId}/all`)
            const data = await response.json()
            
            const convertedSlots = {}
            Object.keys(data || {}).forEach(utcSlotKey => {
              const [utcDateKey, utcTimeSlot] = utcSlotKey.split('_')
              const converted = convertFromUTC(utcDateKey, utcTimeSlot, timezone)
              const convertedSlotKey = `${converted.dateKey}_${converted.timeSlot}`
              convertedSlots[convertedSlotKey] = data[utcSlotKey]
            })
            
            setSelectedSlots(convertedSlots)
          } catch (error) {
            console.error('Ошибка синхронизации после drag:', error)
          }
        }
        
        pendingSlotsRef.current.clear()
        
        setTimeout(() => {
          isDraggingRef.current = false
          setIsDragging(false)
          setDragAction(null)
          setDragStartSlot(null)
          setProcessedSlots(new Set())
          hasMovedRef.current = false
          touchStartRef.current = null
          isScrollingRef.current = false
        }, 10)
      } else {
        touchStartRef.current = null
        isScrollingRef.current = false
      }
    }

    const handleMouseUp = () => handleEnd(null)
    const handleTouchEnd = (event) => handleEnd(event)

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      document.addEventListener('touchcancel', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('touchcancel', handleTouchEnd)
      }
    }
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isDragging, calendarId, timezone, convertFromUTC, handleTouchMove, selectedSlots, nickname, applySlotAction])

  const startSelection = (dateKey, timeSlot) => {
    const localSlotKey = `${dateKey}_${timeSlot}`
    const currentNicknames = selectedSlots[localSlotKey] || []
    const isMySlotSelected = currentNicknames.includes(nickname)
    
    const action = isMySlotSelected ? 'remove' : 'add'
    
    isDraggingRef.current = true
    setIsDragging(true)
    setDragAction(action)
    setDragStartSlot(localSlotKey)
    setProcessedSlots(new Set())
    hasMovedRef.current = false
  }

  const handleMouseDown = (dateKey, timeSlot, event) => {
    if (event.button !== 0) return
    event.preventDefault()
    startSelection(dateKey, timeSlot)
  }

  const handleTouchStart = (dateKey, timeSlot, event) => {
    if (event.touches && event.touches.length > 0) {
      const touch = event.touches[0]
      const calendarWrapper = event.target.closest('.calendar-wrapper')
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        dateKey,
        timeSlot,
        scrollTop: calendarWrapper?.scrollTop || 0,
        scrollLeft: calendarWrapper?.scrollLeft || 0,
        lastSlot: null
      }
      isScrollingRef.current = false
      hasMovedRef.current = false
    }
  }

  const handleMove = (dateKey, timeSlot) => {
    if (isDragging && dragAction) {
      const localSlotKey = `${dateKey}_${timeSlot}`
      
      if (dragStartSlot !== localSlotKey) {
        hasMovedRef.current = true
        
        if (processedSlots.size === 0) {
          const [startDateKey, startTimeSlot] = dragStartSlot.split('_')
          applySlotAction(startDateKey, startTimeSlot, dragAction, true)
        }
      }
      
      applySlotAction(dateKey, timeSlot, dragAction, true)
    }
  }

  const handleMouseEnter = (dateKey, timeSlot) => {
    handleMove(dateKey, timeSlot)
  }

  const handleClick = (dateKey, timeSlot) => {
    const localSlotKey = `${dateKey}_${timeSlot}`
    
    if (isDragging && hasMovedRef.current) {
      return
    }
    
    if (isScrollingRef.current) {
      return
    }
    
    if (dragStartSlot === localSlotKey && !hasMovedRef.current && !isScrollingRef.current) {
      const currentNicknames = selectedSlots[localSlotKey] || []
      const isMySlotSelected = currentNicknames.includes(nickname)
      const action = isMySlotSelected ? 'remove' : 'add'
      applySlotAction(dateKey, timeSlot, action, false)
    }
  }

  const getSlotNicknames = (dateKey, timeSlot) => {
    const slotKey = `${dateKey}_${timeSlot}`
    return selectedSlots[slotKey] || []
  }

  const isSlotSelected = (dateKey, timeSlot) => {
    const nicknames = getSlotNicknames(dateKey, timeSlot)
    return nicknames.length > 0
  }

  const hasMySelection = (dateKey, timeSlot) => {
    const nicknames = getSlotNicknames(dateKey, timeSlot)
    return nicknames.includes(nickname)
  }

  const getAllNicknames = () => {
    const nicknamesSet = new Set()
    Object.values(selectedSlots).forEach(nicknames => {
      if (Array.isArray(nicknames)) {
        nicknames.forEach(n => nicknamesSet.add(n))
      }
    })
    return Array.from(nicknamesSet).sort()
  }

  const hasFilteredNicknamesInSlot = (dateKey, timeSlot) => {
    if (!selectedFilterNicknames || selectedFilterNicknames.length === 0) return false

    const slotKey = `${dateKey}_${timeSlot}`
    const nicknames = selectedSlots[slotKey] || []
    if (!Array.isArray(nicknames)) return false
    
    return selectedFilterNicknames.every(filterNick => nicknames.includes(filterNick))
  }

  const toggleFilterNickname = (nick) => {
    setSelectedFilterNicknames(prev => {
      if (prev.includes(nick)) {
        return prev.filter(n => n !== nick)
      } else {
        return [...prev, nick]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="calendar-container">
        <div className="calendar-info">
          <p>Загрузка данных...</p>
        </div>
      </div>
    )
  }

  const allNicknames = getAllNicknames()

  return (
    <div className="calendar-container">
      <div className="filter-container">
        <button
          onClick={() => {
            if (allNicknames.length > 0) {
              setIsFilterOpen(!isFilterOpen)
            }
          }}
          className={`filter-toggle ${allNicknames.length === 0 ? 'disabled' : ''}`}
          disabled={allNicknames.length === 0}
        >
          {selectedFilterNicknames.length > 0 
            ? `Выбрано: ${selectedFilterNicknames.length}` 
            : 'Выбрать ники'}
        </button>
        {isFilterOpen && allNicknames.length > 0 && (
          <div className="filter-dropdown">
            {allNicknames.map(nick => (
              <label key={nick} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFilterNicknames.includes(nick)}
                  onChange={() => toggleFilterNickname(nick)}
                />
                <span>{nick}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="calendar-wrapper" ref={calendarWrapperRef}>
        <div className="calendar-headers">
          <div className="time-column-header">
            <div className="time-header">Время</div>
          </div>
          {dates.map((date, dateIndex) => {
            const dateInfo = formatDate(date)
            return (
              <div key={dateIndex} className="date-header-wrapper">
                <div className={`date-header ${dateInfo.isToday ? 'today' : ''}`}>
                  <div className="date-weekday">{dateInfo.weekday}</div>
                  <div className="date-day">{dateInfo.day}</div>
                  <div className="date-month">{dateInfo.month}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="calendar-scroll-container">
          <div className="calendar-grid">
            <div className="time-column">
              {timeSlots.map(time => (
                <div key={time} className="time-cell">
                  {time}
                </div>
              ))}
            </div>
            {dates.map((date, dateIndex) => {
              const dateInfo = formatDate(date)
              return (
                <div key={dateIndex} className="date-column">
                  {timeSlots.map(time => {
                    const slotKey = `${dateInfo.fullDate}_${time}`
                    const isSelected = isSlotSelected(dateInfo.fullDate, time)
                    const nicknames = getSlotNicknames(dateInfo.fullDate, time)
                    const hasMySelection = nicknames.includes(nickname)
                    const otherNicknames = nicknames.filter(n => n !== nickname)
                    const isHighlighted = hasFilteredNicknamesInSlot(dateInfo.fullDate, time)
                    
                    return (
                      <div
                        key={time}
                        data-date-key={dateInfo.fullDate}
                        data-time-slot={time}
                        className={`time-slot ${isSelected ? (hasMySelection ? 'selected-mine' : 'selected-other') : ''} ${isHighlighted ? 'highlighted' : ''} ${hoveredSlot === slotKey ? 'hovered' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleMouseDown(dateInfo.fullDate, time, e)
                        }}
                        onTouchStart={(e) => {
                          handleTouchStart(dateInfo.fullDate, time, e)
                        }}
                        onMouseEnter={(e) => {
                          if (!isDragging) {
                            setHoveredSlot(slotKey)
                          }
                          handleMouseEnter(dateInfo.fullDate, time)
                        }}
                        onMouseLeave={() => {
                          setHoveredSlot(null)
                        }}
                        onClick={() => handleClick(dateInfo.fullDate, time)}
                        title={isSelected ? `Выбрано: ${nicknames.join(', ')}` : 'Нажмите или зажмите для выбора'}
                      >
                        {isSelected && (
                          <div className="slot-nicknames">
                            {hasMySelection && (
                              <span className="slot-owner mine">{nickname}</span>
                            )}
                            {otherNicknames.map((n, idx) => (
                              <span key={idx} className="slot-owner">{n}</span>
                            ))}
                          </div>
                        )}
                        {hoveredSlot === slotKey && (
                          <div className="slot-tooltip">
                            {formatSlotTooltip(dateInfo.fullDate, time)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarGrid

