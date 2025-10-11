// Performance utilities for React components
import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';

// Higher-order component for memoizing expensive components
export const withMemo = <P extends object>(Component: React.ComponentType<P>) => {
  return memo(Component);
};

// Custom hook for debouncing values to prevent excessive re-renders
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for throttling function calls
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// Simple memoized wrapper component
export const MemoizedListItem = memo<{ children: React.ReactNode; id: string | number }>(({ children, id }) => {
  return React.createElement('div', { key: id }, children);
});

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) { // Log slow renders (>100ms)
        console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (
  items: any[],
  containerHeight: number,
  itemHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
    }));
  }, [items, scrollTop, containerHeight, itemHeight]);
  
  return {
    visibleItems,
    scrollTop,
    setScrollTop,
    totalHeight: items.length * itemHeight,
  };
};

// Image lazy loading hook
export const useLazyImage = (src: string) => {
  const [imageSrc, setImageSrc] = React.useState<string>();
  const [imageRef, setImageRef] = React.useState<HTMLImageElement>();
  
  React.useEffect(() => {
    let observer: IntersectionObserver;
    
    if (imageRef && imageSrc !== src) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      
      observer.observe(imageRef);
    }
    
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, imageSrc, src]);
  
  
  return [imageSrc, setImageRef] as const;
};

// Component preloader for critical components
export const preloadComponent = (componentImport: () => Promise<any>) => {
  const componentPromise = componentImport();
  return () => componentPromise;
};