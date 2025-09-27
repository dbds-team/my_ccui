// Enhanced touch handling for mobile devices
import React, { useRef, useCallback } from 'react';
import PlatformUtils from '../utils/platform';

export default function TouchHandler({ 
  children, 
  onTap, 
  onLongPress, 
  onSwipeLeft, 
  onSwipeRight,
  enableHaptics = true,
  hapticIntensity = 'light',
  className = ''
}) {
  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isDraggingRef.current = false;

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current && enableHaptics) {
          PlatformUtils.hapticFeedback('medium');
        }
        onLongPress && onLongPress(e);
      }, 500); // 500ms for long press
    }
  }, [onLongPress, enableHaptics]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If moved more than 10px, consider it dragging
    if (deltaX > 10 || deltaY > 10) {
      isDraggingRef.current = true;
      
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Check for swipe gestures
    if (!isDraggingRef.current && deltaTime < 300) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Swipe detection (minimum 50px movement, more horizontal than vertical)
      if (absDeltaX > 50 && absDeltaX > absDeltaY * 2) {
        if (enableHaptics) {
          PlatformUtils.hapticFeedback(hapticIntensity);
        }
        
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(e);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(e);
        }
      }
      // Tap detection (quick touch with minimal movement)
      else if (absDeltaX < 10 && absDeltaY < 10 && deltaTime < 300) {
        if (enableHaptics) {
          PlatformUtils.hapticFeedback(hapticIntensity);
        }
        onTap && onTap(e);
      }
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, [onTap, onSwipeLeft, onSwipeRight, enableHaptics, hapticIntensity]);

  const handleTouchCancel = useCallback(() => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      className={`touch-handler ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        touchAction: 'manipulation', // Disable double-tap zoom
        userSelect: 'none' // Disable text selection
      }}
    >
      {children}
    </div>
  );
}